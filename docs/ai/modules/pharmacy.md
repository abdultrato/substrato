# IA Module Dossier - Pharmacy

## Scope

This dossier teaches the Substrato AI how Pharmacy works across stock, lots, inventory movements, sales and internal material requisitions, including its operational links with Reception, Laboratory, Nursing, Medicine and Warehouse.

Primary code anchors:

- `api/v1/pharmacy/viewsets_impl/core.py`
- `api/v1/pharmacy/serializers.py`
- `api/v1/pharmacy/filters.py`
- `apps/pharmacy/models/product.py`
- `apps/pharmacy/models/lot.py`
- `apps/pharmacy/models/inventory_movement.py`
- `apps/pharmacy/models/material_requisition.py`
- `apps/pharmacy/models/material_requisition_item.py`
- `apps/pharmacy/tests.py`

## Functional purpose

Pharmacy in this project is both:

- a stock domain for pharmacy products and lots;
- a supply hub for internal sectors via material requisitions;
- a consumer of Warehouse stock when the requesting sector is Pharmacy itself.

The AI must not reduce Pharmacy to sales only. The material requisition workflow is a central operational contract.

## Canonical resources

The main public API resources are:

- `/api/v1/pharmacy/product/`
- `/api/v1/pharmacy/lot/`
- `/api/v1/pharmacy/inventory_movement/`
- `/api/v1/pharmacy/sale/`
- `/api/v1/pharmacy/sale_item/`
- `/api/v1/pharmacy/material_requisition/`
- `/api/v1/pharmacy/material_requisition_item/`

Tests assert English routes are canonical, while old Portuguese resource names such as `movimentoestoque` and `requisicaomaterial` should return `404`.

## Core concepts

### Product

Primary commercial and operational item.

Important serializer aliases:

- `categoria` -> `category`
- `tipo` -> `type`
- `preco`, `preço`, `preco_venda` -> `sale_price`
- `iva` -> `vat_percentage`
- `aplica_iva` -> `applies_vat_by_default`

### Lot

Model: `apps/pharmacy/models/lot.py`

Critical behavior:

- each lot belongs to one pharmacy product
- uniqueness is `(product, lot_number)` among non-deleted records
- `initial_quantity` and `lot_number` are immutable after creation
- `sale_price` syncs with product sale price
- `is_expired` compares `expiration_date` to current local date
- `balance()` computes current stock using movement history with backward compatibility for older rows
- `Lot.available(product)` returns FEFO-ordered non-expired lots with positive balance

AI rules:

- "available stock" for a product usually means FEFO lots with `saldo > 0`
- old and new lots differ in whether an initial adjustment movement exists; balance logic handles both

Serializer aliases:

- `produto` -> `product`
- `lote`, `numero_lote`, `número_lote` -> `lot_number`
- `validade` -> `expiration_date`
- `quantidade` -> `initial_quantity`
- `saldo`, `stock`, `estoque` -> computed `saldo`

### InventoryMovement

Represents stock entry, exit or adjustment.

Useful aliases:

- `lote` -> `lot`
- `tipo` -> `type`
- `origem` -> `origin`
- `item_venda` -> `sale_item`
- `item_requisicao` -> `material_request_item`
- `quantidade` -> `quantity`

AI rules:

- movement history is the authoritative operational audit trail for stock changes
- requisition fulfillment creates stock exits with origin `REQ`

### MaterialRequisition

Model: `apps/pharmacy/models/material_requisition.py`

Purpose:

- internal supply request across sectors
- sectors usually request from Pharmacy
- Pharmacy itself requests from Warehouse

Key fields:

- `sector`
- `source`
- `requested_by_department`
- `status`
- `hold_reason`
- `fulfilled_at`
- `fulfilled_by`
- `on_hold_at`
- `on_hold_by`

Sector enum examples:

- `LAB`: Laboratório
- `ENF`: Enfermagem
- `REC`: Recepção
- `MED`: Medicina
- `FAR`: Farmácia
- `FCL`: Farmácia Clínica
- many more operational sectors

Source enum:

- `PHA`: pharmacy stock
- `WHS`: central warehouse

Source rule:

- `source_for_sector(FAR)` returns `WHS`
- all other sectors default to `PHA`

Status enum:

- `PEN`: Pendente
- `PAR`: Parcialmente aviada
- `FUL`: Aviada
- `HLD`: Arquivada

AI rules:

- status is operational workflow state, not just display decoration
- `ON_HOLD` means shortage or deferred handling, not deletion

### MaterialRequisitionItem

Model: `apps/pharmacy/models/material_requisition_item.py`

Exactly one target must be provided:

- `lot`
- `product`
- `warehouse_item`

Operational meaning:

- `lot`: issue from a specific pharmacy lot
- `product`: issue from pharmacy stock by resolving FEFO lots automatically
- `warehouse_item`: issue from warehouse stock

Important fields:

- `requested_quantity`
- `supplied_quantity`
- `notes`

Derived availability:

- `available_quantity`
- `product_available()`
- `warehouse_item_available()`

AI rule:

- if the user asks "how much can we still supply?", compare `requested_quantity - supplied_quantity` against `available_quantity`

## Endpoint catalog

### Lot endpoints

#### `GET /api/v1/pharmacy/lot/`

List lots with search on:

- `custom_id`
- `name`
- `lot_number`
- `product__name`

Useful ordering:

- `-created_at` by default

#### `GET /api/v1/pharmacy/lot/available/`

Purpose:

- list FEFO lots with positive balance and not expired
- optional query param `product`

Behavior:

- if `product` is provided, uses `Lot.available(product)` directly
- otherwise filters runtime list to `not expired` and `balance > 0`

AI should use this concept for questions like:

- "what lots are available for product X?"
- "show near-expiry stock"

#### `GET /api/v1/pharmacy/lot/stock/pdf/`

Operational report endpoint.

Supported filters:

- `include_expired`
- `date_from`
- `date_to`
- optional async export trigger

Returned payload logic includes:

- lots count
- products count
- total balance
- per-lot stock and expiry information

### Inventory movement endpoints

#### `GET /api/v1/pharmacy/inventory_movement/`

Search fields:

- `custom_id`
- `name`
- `type`
- `origin`
- `lot__lot_number`
- `sale_item__custom_id`

#### `GET /api/v1/pharmacy/inventory_movement/history/pdf/`

Filters:

- `date_from`
- `date_to`
- `type`
- `origin`
- `sector`
- `limit`

AI should answer:

- "show exits for requisitions"
- "how many adjustments happened?"
- "which sectors consumed stock?"

### Product endpoints

#### `GET /api/v1/pharmacy/product/`

Search fields:

- `custom_id`
- `name`
- `type`

#### `GET /api/v1/pharmacy/product/consumption/pdf/`

Restricted to Pharmacy users.

Purpose:

- consolidate internal material requisition consumption by product

Filters:

- `date_from`
- `date_to`
- `product_id`
- `product_name`

Important implementation detail:

- report is built over `MaterialRequisitionItem`, not over sales
- includes both direct lot references and product references
- excludes warehouse-only items from pharmacy product consumption

AI should interpret "pharmacy consumption" in this codebase as requisition-based internal supply, unless the user explicitly asks about sales.

#### `GET /api/v1/pharmacy/product/most-requested/pdf/`

Top requested products by internal requisitions.

Filter:

- `limit`

#### `GET /api/v1/pharmacy/product/least-requested/pdf/`

Least requested products by internal requisitions.

Filter:

- `limit`

#### `GET /api/v1/pharmacy/product/request-sectors/pdf/`

Purpose:

- identify which sectors most requested a given product

Required filter:

- `product_id` or `product_name`

AI should use this for questions like:

- "which sectors are driving demand for this product?"
- "is laboratory consuming more of this than nursing?"

### Sale endpoints

#### `GET /api/v1/pharmacy/sale/`

Search fields:

- `custom_id`
- `number`
- `patient__custom_id`
- `patient__name`

AI note:

- Sales exist, but the current AI-rich operational questions are more often about stock and requisitions than about checkout.

### Material requisition endpoints

#### `GET /api/v1/pharmacy/material_requisition/`

This is one of the most important operational resources for AI.

The queryset behavior is role-sensitive:

- Pharmacy users can see all
- non-pharmacy authenticated users are scoped to their requester sectors
- if requester sectors cannot be inferred, fallback is requests created by that user

#### `POST /api/v1/pharmacy/material_requisition/`

Serializer: `MaterialRequisitionSerializer`

Aliases:

- `setor` -> `sector`
- `departamento` -> `requested_by_department`
- `estado` -> `status`
- `itens` -> `items_input`

Write-only payload block:

- `items_input`

Each item must provide exactly one of:

- `lot`
- `product`
- `warehouse_item`

Server logic:

- sector is inferred from user unless admin overrides it
- department snapshot comes from current user profile
- source is computed from sector
- if source is `WHS`, each item must target `warehouse_item`
- if source is `PHA`, each item must target `lot` or `product`

AI should answer:

- "why was this requisition rejected?"
- "why does pharmacy request from warehouse while nursing requests from pharmacy?"

#### `GET /api/v1/pharmacy/material_requisition/requester-context/`

Purpose:

- tell frontend and AI which requester sector the current user can act as

Returns:

- `is_admin`
- `can_create`
- `sector_locked`
- `requester_sector`
- `requester_sector_label`
- `requester_source`
- `requester_source_label`
- `requested_by_department`
- `available_sectors`

This endpoint is the contract behind dynamic requisition form behavior.

AI should use it mentally when the user asks:

- "from which stock should this user request?"
- "why is sector locked?"

#### `GET /api/v1/pharmacy/material_requisition/warehouse-stock/`

Restricted to Pharmacy users.

Purpose:

- expose available central warehouse stock aggregated by item

Availability logic:

- physical stock from `StockLevel`
- minus active reservations from `StockReservation`

Operational meaning:

- this endpoint exists because Pharmacy is itself a requester against Warehouse

Cross-module links:

- Warehouse stock levels
- Warehouse reservations

#### `POST /api/v1/pharmacy/material_requisition/{id}/fulfill/`

Restricted to Pharmacy users.

Purpose:

- issue requested stock and move requisition to partial or fulfilled

Payload:

- `items`: list with `id` and `quantity`

Fulfillment logic:

- blocks if requisition is on hold
- validates requested quantities
- validates remaining quantity
- validates available quantity
- if item targets `lot`, creates `InventoryMovement` exit directly
- if item targets `product`, resolves and issues pharmacy product stock FEFO
- if item targets `warehouse_item`, issues warehouse stock FEFO

After issuing:

- increments `supplied_quantity`
- recalculates requisition status:
  - all supplied -> `FUL`
  - some supplied -> `PAR`

AI should answer:

- "why can’t this requisition be fulfilled?"
- "how does FEFO apply here?"
- "why did status become partial?"

#### `POST /api/v1/pharmacy/material_requisition/{id}/archive/`

Restricted to Pharmacy users.

Purpose:

- place requisition on hold with optional reason

Payload:

- `reason` or `motivo`

AI note:

- archive here means operational hold due to stock or supply constraints, not permanent deletion

#### `POST /api/v1/pharmacy/material_requisition/{id}/skip-item/`

Restricted to Pharmacy users.

Purpose:

- soft-delete one requisition item and recalculate requisition state

Payload:

- `item_id`
- `reason` or `motivo`

Recalculation behavior:

- no remaining items -> requisition auto-archived
- all remaining supplied -> requisition fulfilled
- some supplied -> partial
- none supplied -> pending

AI should use this when asked:

- "can we remove an unavailable item and keep the requisition?"

#### `GET /api/v1/pharmacy/material_requisition/movement-history/pdf/`

Restricted to Pharmacy users.

Purpose:

- show movement history by requesting sector for requisition-driven exits

Filters:

- `date_from`
- `date_to`
- `sector`

This is the cross-sector demand audit endpoint.

### Material requisition item endpoints

#### `GET /api/v1/pharmacy/material_requisition_item/`

Role-sensitive visibility:

- Pharmacy sees all
- other users are restricted to their own requester sectors or self-created requisitions

Useful search fields:

- `custom_id`
- `lot__product__name`
- `lot__lot_number`
- `requisition__custom_id`

## Cross-module graph

Pharmacy connects directly to:

- Warehouse:
  - `WarehouseItem`
  - `StockLevel`
  - `StockReservation`
  - `StockMovement`
- Reception:
  - sector `REC` can request supplies from Pharmacy
- Laboratory:
  - sector `LAB` can request supplies from Pharmacy
- Nursing:
  - sector `ENF` can request supplies from Pharmacy
- Medicine:
  - sector `MED` and `MOC` can request supplies from Pharmacy
- Clinical Pharmacy:
  - sector `FCL` requests from Pharmacy stock
- Billing and Payments:
  - indirectly through product sale and patient flows

Operational interpretation:

- material requisitions are one of the main bridges between Pharmacy and the rest of the hospital platform

## Important AI reasoning rules

- A Pharmacy user is not just a supplier; Pharmacy can itself become a requester against Warehouse.
- Product-level fulfillment differs from lot-level fulfillment:
  - product-level resolves FEFO lots automatically
  - lot-level targets an exact lot
- Consumption reports in this module are requisition-based, not generic commercial sales analytics.
- A requisition item with `warehouse_item` does not belong to pharmacy product consumption reports.
- `available_quantity` is contextual:
  - lot -> lot balance
  - product -> sum of available FEFO lots
  - warehouse item -> physical minus reserved

## Query patterns the AI should handle well

- "mostre os lotes disponíveis do produto X"
- "há lotes expirados ou perto da validade?"
- "qual era o stock ontem?"
- "quais setores mais requisitaram este produto?"
- "por que esta requisição ficou parcial?"
- "a farmácia pode pedir diretamente ao armazém?"
- "laboratório pede à farmácia ou ao armazém?"
- "quanto stock está reservado no armazém?"
- "que itens desta requisição ainda podem ser aviados?"
- "qual a diferença entre produto, lote e item de armazém?"

## AI limitations to state explicitly

- report endpoints are role-restricted and many are Pharmacy-only
- tenant scoping applies to all product, lot, requisition and warehouse references
- on-hold requisitions are blocked from fulfillment until manually reactivated through workflow decisions
- sales data and internal requisition consumption are different operational datasets
