import pytest

from security.permissions.rbac import GROUPS

EXPECTED_WAREHOUSE_RESOURCE_KEYS = {
    "cycle_count",
    "cycle_count_line",
    "goods_receipt",
    "goods_receipt_line",
    "item",
    "item_category",
    "lot",
    "pick_list",
    "pick_list_line",
    "purchase_order",
    "purchase_order_line",
    "replenishment_plan",
    "replenishment_suggestion",
    "sales_order",
    "sales_order_line",
    "shipment",
    "shipment_line",
    "stock_level",
    "stock_movement",
    "stock_reservation",
    "stock_transfer",
    "stock_transfer_line",
    "storage_location",
    "warehouse",
}

LEGACY_PORTUGUESE_RESOURCE_KEYS = {
    "armazem",
    "categoriaitem",
    "contagemciclica",
    "contagemciclicalinha",
    "expedicao",
    "linhaexpedicao",
    "linhaordemcompra",
    "linharecebimento",
    "linhapedidovenda",
    "linhaseparacao",
    "linhatransferencia",
    "localizacao",
    "lote",
    "movimento",
    "ordemcompra",
    "pedidovenda",
    "planoreposicao",
    "recebimento",
    "reserva",
    "saldo",
    "separacao",
    "sugestaoreposicao",
    "transferencia",
}

LEGACY_PORTUGUESE_ACTION_PATHS = {
    "alocar",
    "cancelar",
    "concluir",
    "confirmar",
    "criar-pedido-compra",
    "expedir",
    "gerar",
    "gerar-separacao",
    "lancar",
    "liberar",
}


def test_warehouse_api_maps_use_english_resource_keys():
    from api.v1.warehouse.filters import FILTER_MAP
    from api.v1.warehouse.serializers import SERIALIZER_MAP
    from api.v1.warehouse.viewsets import VIEWSET_MAP

    assert set(VIEWSET_MAP) == EXPECTED_WAREHOUSE_RESOURCE_KEYS
    assert set(SERIALIZER_MAP) == EXPECTED_WAREHOUSE_RESOURCE_KEYS
    assert set(FILTER_MAP) == EXPECTED_WAREHOUSE_RESOURCE_KEYS
    assert not (set(VIEWSET_MAP) & LEGACY_PORTUGUESE_RESOURCE_KEYS)


def test_warehouse_workflow_actions_use_english_paths():
    from api.v1.warehouse.viewsets import VIEWSET_MAP

    action_paths = {
        action.url_path
        for viewset in VIEWSET_MAP.values()
        for action in viewset.get_extra_actions()
    }

    assert LEGACY_PORTUGUESE_ACTION_PATHS.isdisjoint(action_paths)
    assert {
        "allocate",
        "cancel",
        "complete",
        "confirm",
        "create-pick-list",
        "create-purchase-order",
        "generate",
        "post",
        "release",
        "ship",
    }.issubset(action_paths)


@pytest.mark.django_db
def test_warehouse_stock_level_route_is_english_and_visible_to_sidebar_roles(api_client):
    from django.contrib.auth import get_user_model
    from django.contrib.auth.models import Group

    from apps.tenants.models.tenant import Tenant

    tenant = Tenant.objects.create(
        identifier="tn-warehouse-api",
        name="Tenant Warehouse API",
        domain="warehouse-api.local",
        active=True,
    )
    user = get_user_model().objects.create_user(
        username="warehouse_accounting",
        email="warehouse-accounting@example.com",
        password="testpass123",
        tenant=tenant,
    )
    group, _ = Group.objects.get_or_create(name=GROUPS["CONTABILIDADE"])
    user.groups.add(group)

    api_client.defaults["HTTP_HOST"] = tenant.domain
    api_client.force_authenticate(user=user)

    response = api_client.get("/api/v1/warehouse/stock_level/")
    legacy_response = api_client.get("/api/v1/warehouse/saldo/")

    assert response.status_code == 200, response.content
    assert legacy_response.status_code == 404
