"""Utilitário para aplicar verbose_name/_plural globais em modelos dinamicamente."""

from __future__ import annotations

from django.apps import apps
from django.db import models
from django.db.models.signals import class_prepared

_SINAL_CONECTADO = False


ROTULOS_FIXOS = {
    "id": "ID",
    "custom_id": "Código",
    "name": "Nome",
    "description": "Descrição",
    "tenant": "Unidade",
    "active": "Ativo",
    "deleted": "Eliminado",
    "version": "Versão",
    "created_at": "Criado em",
    "updated_at": "Atualizado em",
    "deleted_at": "Eliminado em",
    "created_by": "Criado por",
    "updated_by": "Atualizado por",
    "deleted_by": "Deletado por",
    "order": "Ordem",
    "position": "Posição",
    "date": "Data",
    "record_date": "Data de registo",
    "performed_date": "Data de realização",
    "collected_at": "Coletado em",
    "quantity": "Quantidade",
    "initial_quantity": "Qtd. inicial",
    "default_quantity": "Qtd. padrão",
    "price": "Preço",
    "sale_price": "Preço de venda",
    "default_price": "Preço padrão",
    "unit_price": "Preço unitário",
    "unit_cost": "Custo unitário",
    "default_unit_cost": "Custo unitário padrão",
    "services_subtotal": "Subtotal serviços",
    "materials_subtotal": "Subtotal materiais",
    "total": "Total",
    "status": "Status",
    "observation": "Observação",
    "notes": "Observações",
    "patient": "Paciente",
    "professional": "Profissional",
    "procedure": "Procedimento",
    "procedure_item": "Item do procedimento",
    "catalog": "Catálogo",
    "item": "Item",
    "material": "Material",
    "product": "Produto",
    "lot": "Lote",
    "category": "Categoria",
    "parent_category": "Categoria pai",
    "sale": "Venda",
    "sale_item": "Item da venda",
    "inventory_movement": "Movimento de estoque",
    "invoice": "Fatura",
    "method": "Método",
    "sector": "Setor",
    "number": "Número",
    "lot_number": "Número do lote",
    "document_number": "Número do documento",
    "email": "Email",
    "phone": "Telefone",
    "contact": "Contacto",
    "event_type": "Tipo de evento",
}


TOKENS_CURTOS = {
    "id": "ID",
    "em": "em",
    "de": "de",
    "do": "do",
    "da": "da",
    "por": "por",
    "e": "e",
    "ou": "ou",
    "api": "API",
    "url": "URL",
    "uuid": "UUID",
    "type": "Tipo",
    "number": "Número",
    "price": "Preço",
    "custo": "Custo",
    "description": "Descrição",
    "version": "Versão",
    "method": "Método",
    "catalog": "Catálogo",
    "padrao": "Padrão",
    "record": "Registo",
    "sale": "Venda",
    "procedure": "Procedimento",
    "request": "Pedido",
    "user": "Utilizador",
    "deleted": "Eliminado",
}


def _label_for_name(field_name: str) -> str:
    if field_name in ROTULOS_FIXOS:
        return ROTULOS_FIXOS[field_name]

    parts = [part for part in field_name.split("_") if part]
    if not parts:
        return field_name

    words = []
    for index, part in enumerate(parts):
        base = TOKENS_CURTOS.get(part.lower())
        if base is None:
            base = part.capitalize()
        elif index > 0 and base.isupper() is False:
            base = base.lower()
        words.append(base)

    return " ".join(words)


def _should_apply_model(model: type[models.Model]) -> bool:
    app_config = model._meta.app_config
    if app_config is None:
        return False

    app_name = app_config.name
    return app_name.startswith("apps.") or app_name == "system"


def _apply_verbose_to_model(model: type[models.Model]) -> None:
    if not _should_apply_model(model):
        return

    for field in model._meta.get_fields():
        if not isinstance(field, models.Field):
            continue
        if field.auto_created and not field.concrete:
            continue

        padrao = field.name.replace("_", " ")
        if field.verbose_name == padrao:
            field.verbose_name = _label_for_name(field.name)


def _on_class_prepared(sender, **kwargs):
    _apply_verbose_to_model(sender)


def apply_global_verbose_names() -> None:
    global _SINAL_CONECTADO

    if not _SINAL_CONECTADO:
        class_prepared.connect(
            _on_class_prepared,
            dispatch_uid="substrato_verbose_names_class_prepared",
            weak=False,
        )
        _SINAL_CONECTADO = True

    for model in apps.get_models():
        _apply_verbose_to_model(model)


_rotulo_para_name = _label_for_name
_deve_aplicar_model = _should_apply_model
_aplicar_verbose_em_model = _apply_verbose_to_model
aplicar_verbose_names_globais = apply_global_verbose_names
