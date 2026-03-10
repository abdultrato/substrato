from __future__ import annotations

from django.apps import apps
from django.db import models
from django.db.models.signals import class_prepared


_SINAL_CONECTADO = False


ROTULOS_FIXOS = {
    "id": "ID",
    "id_custom": "Código",
    "nome": "Nome",
    "descricao": "Descrição",
    "inquilino": "Unidade",
    "ativo": "Ativo",
    "deletado": "Deletado",
    "versao": "Versão",
    "criado_em": "Criado em",
    "atualizado_em": "Atualizado em",
    "deletado_em": "Deletado em",
    "criado_por": "Criado por",
    "atualizado_por": "Atualizado por",
    "deletado_por": "Deletado por",
    "ordem": "Ordem",
    "data": "Data",
    "data_registro": "Data de registro",
    "data_realizacao": "Data de realização",
    "coletado_em": "Coletado em",
    "quantidade": "Quantidade",
    "quantidade_inicial": "Qtd. inicial",
    "quantidade_padrao": "Qtd. padrão",
    "preco": "Preço",
    "preco_venda": "Preço de venda",
    "preco_padrao": "Preço padrão",
    "preco_unitario": "Preço unitário",
    "custo_unitario": "Custo unitário",
    "custo_unitario_padrao": "Custo unitário padrão",
    "subtotal_servicos": "Subtotal serviços",
    "subtotal_materiais": "Subtotal materiais",
    "total": "Total",
    "estado": "Estado",
    "status": "Status",
    "observacao": "Observação",
    "observacoes": "Observações",
    "paciente": "Paciente",
    "profissional": "Profissional",
    "procedimento": "Procedimento",
    "procedimento_item": "Item do procedimento",
    "catalogo": "Catálogo",
    "item": "Item",
    "material": "Material",
    "produto": "Produto",
    "lote": "Lote",
    "categoria": "Categoria",
    "categoria_pai": "Categoria pai",
    "venda": "Venda",
    "item_venda": "Item da venda",
    "movimento_estoque": "Movimento de estoque",
    "fatura": "Fatura",
    "metodo": "Método",
    "setor": "Setor",
    "numero": "Número",
    "numero_lote": "Número do lote",
    "numero_id": "Número de ID",
    "email": "Email",
    "telefone": "Telefone",
    "contacto": "Contacto",
    "tipo_evento": "Tipo de evento",
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
    "tipo": "Tipo",
    "numero": "Número",
    "preco": "Preço",
    "custo": "Custo",
    "descricao": "Descrição",
    "versao": "Versão",
    "metodo": "Método",
    "catalogo": "Catálogo",
    "padrao": "Padrão",
}


def _rotulo_para_nome(nome_campo: str) -> str:
    if nome_campo in ROTULOS_FIXOS:
        return ROTULOS_FIXOS[nome_campo]

    partes = [p for p in nome_campo.split("_") if p]
    if not partes:
        return nome_campo

    palavras = []
    for idx, parte in enumerate(partes):
        base = TOKENS_CURTOS.get(parte.lower())
        if base is None:
            base = parte.capitalize()
        elif idx > 0 and base.isupper() is False:
            base = base.lower()
        palavras.append(base)

    return " ".join(palavras)


def _deve_aplicar_modelo(model: type[models.Model]) -> bool:
    app_config = model._meta.app_config
    if app_config is None:
        return False

    app_name = app_config.name
    return app_name.startswith("aplicativos.") or app_name == "sistema"


def _aplicar_verbose_em_modelo(model: type[models.Model]) -> None:
    if not _deve_aplicar_modelo(model):
        return

    for field in model._meta.get_fields():
        if not isinstance(field, models.Field):
            continue
        if field.auto_created and not field.concrete:
            continue

        padrao = field.name.replace("_", " ")
        if field.verbose_name == padrao:
            field.verbose_name = _rotulo_para_nome(field.name)


def _on_class_prepared(sender, **kwargs):
    _aplicar_verbose_em_modelo(sender)


def aplicar_verbose_names_globais() -> None:
    global _SINAL_CONECTADO

    if not _SINAL_CONECTADO:
        class_prepared.connect(
            _on_class_prepared,
            dispatch_uid="substrato_verbose_names_class_prepared",
            weak=False,
        )
        _SINAL_CONECTADO = True

    for model in apps.get_models():
        _aplicar_verbose_em_modelo(model)
