from __future__ import annotations

from collections.abc import Iterable
from contextlib import contextmanager, suppress
from datetime import date, timedelta
from decimal import Decimal
import random

from django.apps import apps
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone
from faker import Faker

from aplicativos.clinico.modelos.evento_clinico import EventoClinico
from aplicativos.clinico.modelos.exame import Exame
from aplicativos.clinico.modelos.exame_campo import ExameCampo
from aplicativos.clinico.modelos.exames_medicos import ExameMedico, ExameMedicoCampo
from aplicativos.clinico.modelos.historico_clinico import HistoricoClinico
from aplicativos.clinico.modelos.paciente import Paciente
from aplicativos.clinico.modelos.referencia_clinica import ReferenciaClinica
from aplicativos.clinico.modelos.requisicao_analise import RequisicaoAnalise
from aplicativos.clinico.modelos.requisicao_item import RequisicaoItem
from aplicativos.clinico.modelos.resultado import Resultado
from aplicativos.clinico.modelos.resultado_analise import ResultadoItem
from aplicativos.contabilidade.modelos.conciliacao import ConciliacaoFinanceira
from aplicativos.contabilidade.modelos.contas import Conta
from aplicativos.contabilidade.modelos.lancamento import Lancamento
from aplicativos.contabilidade.modelos.ledger_entry import LedgerEntry
from aplicativos.contabilidade.modelos.ledger_line import LedgerLine
from aplicativos.contabilidade.modelos.movimento import Movimento
from aplicativos.contabilidade.modelos.saldo_conta import SaldoConta
from aplicativos.enfermagem.modelos import (
    EvolucaoEnfermagem,
    PrescricaoEnfermagem,
    Procedimento,
    ProcedimentoCatalogo,
    ProcedimentoCatalogoMaterial,
    ProcedimentoItem,
    ProcedimentoMaterial,
    RegistroEnfermagem,
    SinalVitalEnfermagem,
)
from aplicativos.farmacia.models.categoria_produto import CategoriaProduto
from aplicativos.farmacia.models.item_venda import ItemVenda
from aplicativos.farmacia.models.lote import Lote
from aplicativos.farmacia.models.movimento import MovimentoEstoque, OrigemMovimento, TipoMovimento
from aplicativos.farmacia.models.produto import Produto
from aplicativos.farmacia.models.venda import Venda
from aplicativos.faturamento.modelos.fatura import Fatura
from aplicativos.faturamento.modelos.historico_fatura import HistoricoFatura
from aplicativos.identidade.modelos.password_reset import PasswordResetToken
from aplicativos.identidade.modelos.perfil import PerfilProfissional
from aplicativos.identidade.modelos.usuario import Usuario
from aplicativos.inquilinos.modelos.assinatura import AssinaturaTenant
from aplicativos.inquilinos.modelos.configuracao import ConfiguracaoInquilino
from aplicativos.inquilinos.modelos.feature_flags import FeatureFlagTenant
from aplicativos.inquilinos.modelos.inquilino import Inquilino
from aplicativos.inquilinos.modelos.plano_assinatura import PlanoAssinatura
from aplicativos.inquilinos.modelos.uso_tenant import UsoTenant
from aplicativos.notificacoes.modelos.log_envio import LogEnvio
from aplicativos.notificacoes.modelos.notificacao import Notificacao
from aplicativos.notificacoes.modelos.template import TemplateNotificacao
from aplicativos.pagamentos.modelos.historico_pagamento import HistoricoPagamento
from aplicativos.pagamentos.modelos.pagamentos import Pagamento
from aplicativos.pagamentos.modelos.recibo import Recibo
from aplicativos.pagamentos.modelos.reconciliacao import Reconciliacao
from aplicativos.pagamentos.modelos.transacao import Transacao
from aplicativos.recepcao.modelos.checkin_recepcao import CheckinRecepcao
from aplicativos.seguradora.modelos.autorizacao import AutorizacaoProcedimento
from aplicativos.seguradora.modelos.plano_cobertura import PlanoCobertura
from aplicativos.seguradora.modelos.seguradora import Seguradora
from aplicativos.seguradora.modelos.tenant_plano import TenantPlanoCobertura
from infrastrutura.contexto.inquilino import reset_inquilino, set_inquilino
from nucleo.constantes.tipo_evento_clinico import TipoEventoClinico


@contextmanager
def tenant_ctx(tenant: Inquilino):
    token = set_inquilino(tenant)
    try:
        yield
    finally:
        reset_inquilino(token)


def _count(model) -> int:
    return model.objects.count()


def _needed(model, n: int) -> int:
    return max(0, n - _count(model))


def _moz_phone(i: int) -> str:
    # TelefoneField valida 9 digitos e prefixos 82..87 (Moçambique).
    # Gera algo como: 84xxxxxxx
    return f"84{i:07d}"


def _safe_choice_value(model, field_name: str):
    choices = list(model._meta.get_field(field_name).choices)
    return choices[0][0] if choices else None


def _ensure_local_tenant() -> Inquilino:
    tenant = Inquilino.objects.filter(identificador="local").order_by("id").first()
    if tenant:
        return tenant
    return Inquilino.objects.create(
        identificador="local",
        nome="Tenant Local",
        dominio="localhost",
        ativo=True,
        status_comercial=Inquilino.StatusComercial.TRIAL,
    )


def ensure_inquilinos(n: int, faker: Faker) -> list[Inquilino]:
    tenants: list[Inquilino] = []
    tenants.append(_ensure_local_tenant())

    while len(tenants) < n:
        idx = len(tenants) + 1
        identificador = f"seed-tenant-{idx:04d}"
        obj, created = Inquilino.objects.get_or_create(
            identificador=identificador,
            defaults={
                "nome": f"Clínica {faker.city()} {idx}",
                "dominio": f"tenant{idx}.localhost",
                "ativo": True,
                "status_comercial": Inquilino.StatusComercial.TRIAL,
                "trial_ate": timezone.localdate() + timedelta(days=30),
            },
        )
        if created:
            tenants.append(obj)
        else:
            tenants.append(obj)

    return list(Inquilino.objects.order_by("id")[:n])


def ensure_config_uso(tenants: Iterable[Inquilino]) -> None:
    for idx, tenant in enumerate(tenants, start=1):
        ConfiguracaoInquilino.objects.get_or_create(
            inquilino=tenant,
            defaults={
                "fuso_horario": "Africa/Maputo",
                "moeda": "MZN",
                "idioma": "pt",
                "permite_multi_unidade": idx % 2 == 0,
                "limite_usuarios": 10 + idx,
            },
        )
        UsoTenant.objects.get_or_create(
            inquilino=tenant,
            defaults={
                "usuarios_ativos": 3 + idx,
                "requisicoes_mes_atual": 20 * idx,
            },
        )


def ensure_planos_assinatura(n: int) -> list[PlanoAssinatura]:
    tipos = [c[0] for c in PlanoAssinatura.TipoPlano.choices]
    while _count(PlanoAssinatura) < n:
        idx = _count(PlanoAssinatura) + 1
        tipo = tipos[(idx - 1) % len(tipos)]
        PlanoAssinatura.objects.create(
            nome=f"Plano {tipo} {idx}",
            descricao=f"Plano de assinatura seed ({tipo})",
            ordem=idx,
            tipo=tipo,
            limite_usuarios=5 + idx,
            limite_requisicoes_mes=1000 + 10 * idx,
            preco_mensal=Decimal("0.00") if tipo == PlanoAssinatura.TipoPlano.FREE else Decimal("1990.00"),
            preco_excedente_requisicao=Decimal("5.00"),
            suporte_prioritario=tipo == PlanoAssinatura.TipoPlano.PRO,
            permite_multi_unidade=tipo != PlanoAssinatura.TipoPlano.FREE,
            ativo=True,
        )
    return list(PlanoAssinatura.objects.order_by("id")[:n])


def ensure_assinaturas(n: int, tenants: list[Inquilino], planos: list[PlanoAssinatura]) -> None:
    # Garante pelo menos 1 assinatura por tenant (e no minimo n no total).
    for idx, tenant in enumerate(tenants, start=1):
        if not AssinaturaTenant.objects.filter(inquilino=tenant).exists():
            plano = planos[(idx - 1) % len(planos)]
            AssinaturaTenant.objects.create(
                inquilino=tenant,
                plano=plano,
                status=AssinaturaTenant.Status.ATIVA,
                ciclo=AssinaturaTenant.Ciclo.MENSAL,
                data_inicio=timezone.localdate() - timedelta(days=10 * idx),
            )

    while _count(AssinaturaTenant) < n:
        idx = _count(AssinaturaTenant) + 1
        tenant = tenants[(idx - 1) % len(tenants)]
        plano = planos[(idx - 1) % len(planos)]
        AssinaturaTenant.objects.create(
            inquilino=tenant,
            plano=plano,
            status=AssinaturaTenant.Status.ATIVA,
            ciclo=AssinaturaTenant.Ciclo.MENSAL,
            data_inicio=timezone.localdate() - timedelta(days=idx),
        )


def ensure_feature_flags(n: int, tenants: list[Inquilino]) -> None:
    chaves_base = [
        "LAB_PDF",
        "PAGAMENTOS",
        "FATURAMENTO",
        "ENFERMAGEM",
        "FARMACIA",
        "NOTIFICACOES",
        "SEGURADORA",
        "CONTABILIDADE",
    ]
    while _count(FeatureFlagTenant) < n:
        idx = _count(FeatureFlagTenant) + 1
        tenant = tenants[(idx - 1) % len(tenants)]
        chave = f"{chaves_base[(idx - 1) % len(chaves_base)]}_{idx:02d}"
        FeatureFlagTenant.objects.get_or_create(
            inquilino=tenant,
            chave=chave,
            defaults={"ativo": idx % 3 != 0},
        )


def ensure_usuarios(n: int, tenants: list[Inquilino], password: str, faker: Faker) -> list[Usuario]:
    while Usuario.objects.count() < n:
        idx = Usuario.objects.count() + 1
        tenant = tenants[(idx - 1) % len(tenants)]
        username = f"seeduser{idx:04d}"
        email = f"{username}@example.com"

        if Usuario.objects.filter(username=username).exists() or Usuario.objects.filter(email=email).exists():
            # Fallback: garante unicidade mesmo com dados existentes.
            suf = timezone.now().strftime("%H%M%S")
            username = f"{username}_{suf}"
            email = f"{username}@example.com"

        first_name = faker.first_name()
        last_name = faker.last_name()

        Usuario.objects.create_user(
            username=username,
            email=email,
            password=password,
            nome=f"{first_name} {last_name}",
            first_name=first_name,
            last_name=last_name,
            telefone=_moz_phone(idx),
            is_active=True,
            inquilino=tenant,
        )

    return list(Usuario.objects.order_by("id")[:n])


def ensure_perfis_profissionais(users: list[Usuario], faker: Faker) -> None:
    for idx, user in enumerate(users, start=1):
        PerfilProfissional.objects.get_or_create(
            usuario=user,
            defaults={
                "cargo": random.choice(["Analista", "Enfermeiro", "Recepcionista", "Farmacêutico"]),
                "registro_profissional": f"REG-{idx:06d}",
                "departamento": random.choice(["Laboratório", "Recepção", "Enfermagem", "Farmácia"]),
            },
        )


def ensure_password_reset_tokens(n: int, users: list[Usuario]) -> None:
    while PasswordResetToken.objects.count() < n:
        idx = PasswordResetToken.objects.count() + 1
        user = users[(idx - 1) % len(users)]
        PasswordResetToken.objects.create(user=user)


def ensure_categorias_produto(n: int, tenants: list[Inquilino], faker: Faker) -> list[CategoriaProduto]:
    # CategoriaProduto possui unique (inquilino, nome)
    while _count(CategoriaProduto) < n:
        idx = _count(CategoriaProduto) + 1
        tenant = tenants[(idx - 1) % len(tenants)]
        with tenant_ctx(tenant):
            nome = f"Categoria {faker.word().title()} {idx}"
            CategoriaProduto.objects.get_or_create(
                inquilino=tenant,
                nome=nome,
                defaults={"descricao": f"Categoria seed {idx}"},
            )

    return list(CategoriaProduto.objects.order_by("id")[:n])


def ensure_produtos(
    n: int, tenants: list[Inquilino], categorias: list[CategoriaProduto], faker: Faker
) -> list[Produto]:
    tipos = [c[0] for c in Produto.TipoProduto.choices]

    while _count(Produto) < n:
        idx = _count(Produto) + 1
        tenant = tenants[(idx - 1) % len(tenants)]
        categoria = next((c for c in categorias if c.inquilino_id == tenant.id), None)
        with tenant_ctx(tenant):
            Produto.objects.create(
                inquilino=tenant,
                nome=f"{faker.word().title()} {faker.word().title()} {idx}",
                categoria=categoria,
                tipo=tipos[(idx - 1) % len(tipos)],
                preco_venda=Decimal("25.00") + Decimal(idx),
            )

    return list(Produto.objects.order_by("id")[:n])


def ensure_lotes(n: int, produtos: list[Produto]) -> list[Lote]:
    while _count(Lote) < n:
        idx = _count(Lote) + 1
        produto = produtos[(idx - 1) % len(produtos)]
        numero_lote = f"SEED-{produto.id or 0}-{idx:04d}"
        with tenant_ctx(produto.inquilino):
            if Lote.objects.filter(produto=produto, numero_lote=numero_lote).exists():
                continue
            Lote.objects.create(
                inquilino=produto.inquilino,
                produto=produto,
                numero_lote=numero_lote,
                validade=timezone.localdate() + timedelta(days=365 + idx),
                quantidade_inicial=1000,
            )
    return list(Lote.objects.order_by("id")[:n])


def ensure_vendas(n: int, tenants: list[Inquilino]) -> list[Venda]:
    while _count(Venda) < n:
        idx = _count(Venda) + 1
        tenant = tenants[(idx - 1) % len(tenants)]
        with tenant_ctx(tenant):
            numero = f"VEND-SEED-{tenant.id}-{idx:06d}"
            if Venda.objects.filter(inquilino=tenant, numero=numero).exists():
                continue
            Venda.objects.create(
                inquilino=tenant,
                numero=numero,
            )
    return list(Venda.objects.order_by("id")[:n])


def ensure_itens_venda(n: int, vendas: list[Venda], produtos: list[Produto]) -> list[ItemVenda]:
    # Cria itens garantindo estoque (ItemVenda baixa do lote automaticamente).
    while _count(ItemVenda) < n:
        idx = _count(ItemVenda) + 1
        venda = vendas[(idx - 1) % len(vendas)]

        produtos_tenant = [p for p in produtos if p.inquilino_id == venda.inquilino_id]
        if not produtos_tenant:
            break

        # Escolhe um produto que não esteja na venda.
        produto = next(
            (
                p
                for p in produtos_tenant
                if not ItemVenda.objects.filter(venda=venda, produto=p, deletado=False).exists()
            ),
            None,
        )
        if produto is None:
            continue

        with tenant_ctx(venda.inquilino):
            ItemVenda.objects.create(
                inquilino=venda.inquilino,
                venda=venda,
                produto=produto,
                quantidade=1,
            )
    return list(ItemVenda.objects.order_by("id")[:n])


def ensure_movimentos_estoque(n: int, lotes: list[Lote]) -> None:
    # MovimentoEstoque ja e criado por vendas/procedimentos. Este passo so completa se faltar.
    while _count(MovimentoEstoque) < n and lotes:
        idx = _count(MovimentoEstoque) + 1
        lote = lotes[(idx - 1) % len(lotes)]
        with tenant_ctx(lote.inquilino):
            MovimentoEstoque.objects.create(
                inquilino=lote.inquilino,
                lote=lote,
                tipo=TipoMovimento.ENTRADA,
                origem=OrigemMovimento.AJUSTE,
                quantidade=5,
            )


def ensure_exames(n: int, tenants: list[Inquilino], faker: Faker) -> list[Exame]:
    metodo = _safe_choice_value(Exame, "metodo")
    setor = _safe_choice_value(Exame, "setor")

    while _count(Exame) < n:
        idx = _count(Exame) + 1
        tenant = tenants[(idx - 1) % len(tenants)]
        with tenant_ctx(tenant):
            Exame.objects.create(
                inquilino=tenant,
                nome=f"{faker.word().title()} {faker.word().title()} ({idx})",
                trl_horas=24 + (idx % 24),
                preco=Decimal("150.00") + Decimal(idx),
                metodo=metodo,
                setor=setor,
            )
    return list(Exame.objects.order_by("id")[:n])


def ensure_exame_campos(n: int, exames: list[Exame], faker: Faker) -> list[ExameCampo]:
    tipo = _safe_choice_value(ExameCampo, "tipo")
    unidade = _safe_choice_value(ExameCampo, "unidade")

    while _count(ExameCampo) < n:
        idx = _count(ExameCampo) + 1
        exame = exames[(idx - 1) % len(exames)]
        with tenant_ctx(exame.inquilino):
            ExameCampo.objects.create(
                inquilino=exame.inquilino,
                exame=exame,
                nome=f"{faker.word().title()} {idx}",
                tipo=tipo,
                unidade=unidade,
                referencia_min=Decimal("4.00"),
                referencia_max=Decimal("10.00"),
                critico_min=Decimal("2.00"),
                critico_max=Decimal("20.00"),
                delta_max=Decimal("10.00"),
            )
    return list(ExameCampo.objects.order_by("id")[:n])


def ensure_exames_medicos(n: int, tenants: list[Inquilino], faker: Faker) -> list[ExameMedico]:
    metodo = _safe_choice_value(ExameMedico, "metodo")
    setor = _safe_choice_value(ExameMedico, "setor")

    while _count(ExameMedico) < n:
        idx = _count(ExameMedico) + 1
        tenant = tenants[(idx - 1) % len(tenants)]
        with tenant_ctx(tenant):
            ExameMedico.objects.create(
                inquilino=tenant,
                nome=f"Exame Imagem {faker.word().title()} {idx}",
                trl_horas=24 + (idx % 24),
                preco=Decimal("500.00") + Decimal(5 * idx),
                metodo=metodo,
                setor=setor,
            )
    return list(ExameMedico.objects.order_by("id")[:n])


def ensure_exame_medico_campos(n: int, exames: list[ExameMedico], faker: Faker) -> list[ExameMedicoCampo]:
    tipo = _safe_choice_value(ExameMedicoCampo, "tipo")
    unidade = _safe_choice_value(ExameMedicoCampo, "unidade")

    while _count(ExameMedicoCampo) < n:
        idx = _count(ExameMedicoCampo) + 1
        exame = exames[(idx - 1) % len(exames)]
        with tenant_ctx(exame.inquilino):
            ExameMedicoCampo.objects.create(
                inquilino=exame.inquilino,
                exame=exame,
                nome=f"Parâmetro {faker.word().title()} {idx}",
                tipo=tipo,
                unidade=unidade,
                referencia_min=Decimal("0.00"),
                referencia_max=Decimal("100.00"),
                critico_min=Decimal("0.00"),
                critico_max=Decimal("200.00"),
            )
    return list(ExameMedicoCampo.objects.order_by("id")[:n])


def ensure_pacientes(n: int, tenants: list[Inquilino], faker: Faker) -> list[Paciente]:
    genero = _safe_choice_value(Paciente, "genero")
    raca = _safe_choice_value(Paciente, "raca_origem")
    tipo_documento = _safe_choice_value(Paciente, "tipo_documento")
    proveniencia = _safe_choice_value(Paciente, "proveniencia")

    while _count(Paciente) < n:
        idx = _count(Paciente) + 1
        tenant = tenants[(idx - 1) % len(tenants)]
        nome = faker.name()
        email = f"paciente{idx:04d}@example.com"
        numero_id = f"SEED-BI-{idx:06d}"
        with tenant_ctx(tenant):
            Paciente.objects.create(
                inquilino=tenant,
                nome=nome,
                endereco_rua=faker.street_name(),
                endereco_numero=str(faker.building_number()),
                endereco_bairro=faker.city_suffix(),
                endereco_cidade=faker.city(),
                # `pt_PT` não expõe `state()`. Usamos uma lista simples para ficar realista (MZ).
                endereco_provincia=random.choice(
                    [
                        "Maputo",
                        "Gaza",
                        "Inhambane",
                        "Sofala",
                        "Manica",
                        "Tete",
                        "Zambézia",
                        "Nampula",
                        "Cabo Delgado",
                        "Niassa",
                    ]
                ),
                endereco_pais="MZ",
                genero=genero,
                raca_origem=raca,
                tipo_documento=tipo_documento,
                numero_id=numero_id,
                contacto=_moz_phone(1000 + idx),
                email=email,
                proveniencia=proveniencia,
                data_nascimento=date(1990, 1, 1) + timedelta(days=30 * idx),
            )
    return list(Paciente.objects.order_by("id")[:n])


def ensure_requisicoes(n: int, pacientes: list[Paciente], users: list[Usuario]) -> list[RequisicaoAnalise]:
    while _count(RequisicaoAnalise) < n:
        idx = _count(RequisicaoAnalise) + 1
        paciente = pacientes[(idx - 1) % len(pacientes)]
        analista = users[(idx - 1) % len(users)]
        with tenant_ctx(paciente.inquilino):
            RequisicaoAnalise.objects.create(
                paciente=paciente,
                analista=analista,
            )
    return list(RequisicaoAnalise.objects.order_by("id")[:n])


def ensure_requisicao_itens(
    n: int, requisicoes: list[RequisicaoAnalise], exames: list[Exame], exames_medicos: list[ExameMedico]
) -> None:
    # Garante pelo menos 1 exame laboratorial por requisição (gera `ResultadoItem` e itens de fatura).
    for req in requisicoes:
        if RequisicaoItem.objects.filter(requisicao=req, exame__isnull=False, deletado=False).exists():
            continue
        exame = next((e for e in exames if e.inquilino_id == req.inquilino_id), None)
        if exame is None:
            continue
        with tenant_ctx(req.inquilino):
            if not RequisicaoItem.objects.filter(requisicao=req, exame=exame).exists():
                RequisicaoItem.objects.create(requisicao=req, exame=exame)

    # Completa o total de itens (opcionalmente incluindo exames médicos) até atingir `n`.
    while _count(RequisicaoItem) < n and requisicoes:
        idx = _count(RequisicaoItem) + 1
        req = requisicoes[(idx - 1) % len(requisicoes)]
        with tenant_ctx(req.inquilino):
            # Alterna para incluir alguns exames médicos sem quebrar resultado/faturamento.
            if idx % 3 == 0 and exames_medicos:
                exame_med = next((e for e in exames_medicos if e.inquilino_id == req.inquilino_id), None)
                if exame_med is None:
                    continue
                if RequisicaoItem.objects.filter(requisicao=req, exame_medico=exame_med).exists():
                    continue
                RequisicaoItem.objects.create(requisicao=req, exame_medico=exame_med)
                continue

            exame = next((e for e in exames if e.inquilino_id == req.inquilino_id), None)
            if exame is None:
                continue
            if RequisicaoItem.objects.filter(requisicao=req, exame=exame).exists():
                continue
            RequisicaoItem.objects.create(requisicao=req, exame=exame)


def ensure_resultados(requisicoes: list[RequisicaoAnalise], users: list[Usuario]) -> list[Resultado]:
    for idx, req in enumerate(requisicoes, start=1):
        Resultado.objects.get_or_create(
            requisicao=req,
            defaults={
                "inquilino": req.inquilino,
                "analista": users[(idx - 1) % len(users)],
            },
        )
    return list(Resultado.objects.order_by("id"))


def ensure_referencias(n: int, campos: list[ExameCampo], faker: Faker) -> list[ReferenciaClinica]:
    while _count(ReferenciaClinica) < n and campos:
        idx = _count(ReferenciaClinica) + 1
        campo = campos[(idx - 1) % len(campos)]
        with tenant_ctx(campo.inquilino):
            ReferenciaClinica.objects.create(
                inquilino=campo.inquilino,
                nome=f"Referência {faker.word().title()} {idx}",
                exame_campo=campo,
                idade_minima_dias=0,
                idade_maxima_dias=36500,
                valor_minimo=Decimal("4.00"),
                valor_maximo=Decimal("10.00"),
                critico_baixo=Decimal("2.00"),
                critico_alto=Decimal("20.00"),
            )
    return list(ReferenciaClinica.objects.order_by("id")[:n])


def ensure_valores_resultado(n: int) -> None:
    # Preenche alguns valores para ficar mais "real" (sem forcar validacao).
    itens = list(ResultadoItem.objects.filter(resultado_valor__isnull=True).order_by("id")[:n])
    for idx, item in enumerate(itens, start=1):
        with tenant_ctx(item.inquilino):
            item.resultado_valor = Decimal("6.00") + Decimal(idx % 3)
            item.save(update_fields=["resultado_valor"])


def ensure_eventos_clinicos(n: int, pacientes: list[Paciente], requisicoes: list[RequisicaoAnalise]) -> None:
    while _count(EventoClinico) < n and pacientes and requisicoes:
        idx = _count(EventoClinico) + 1
        req = requisicoes[(idx - 1) % len(requisicoes)]
        paciente = req.paciente
        with tenant_ctx(req.inquilino):
            EventoClinico.objects.create(
                inquilino=req.inquilino,
                paciente=paciente,
                requisicao=req,
                tipo_evento=TipoEventoClinico.REQUISICAO_CRIADA,
                descricao=f"Evento clínico seed para {paciente.nome}.",
                nome=f"Evento {idx}",
            )


def ensure_historico_clinico(n: int, pacientes: list[Paciente], faker: Faker) -> None:
    while HistoricoClinico.objects.count() < n and pacientes:
        idx = HistoricoClinico.objects.count() + 1
        paciente = pacientes[(idx - 1) % len(pacientes)]
        HistoricoClinico.objects.create(
            paciente=paciente,
            descricao=f"Histórico clínico: {faker.sentence(nb_words=10)}",
        )


def ensure_registros_enfermagem(n: int, pacientes: list[Paciente], faker: Faker) -> list[RegistroEnfermagem]:
    prioridade = _safe_choice_value(RegistroEnfermagem, "prioridade")
    while _count(RegistroEnfermagem) < n and pacientes:
        idx = _count(RegistroEnfermagem) + 1
        paciente = pacientes[(idx - 1) % len(pacientes)]
        with tenant_ctx(paciente.inquilino):
            RegistroEnfermagem.objects.create(
                inquilino=paciente.inquilino,
                nome=f"Registro Enfermagem {idx}",
                paciente=paciente,
                prioridade=prioridade,
                observacao=faker.sentence(nb_words=12),
            )
    return list(RegistroEnfermagem.objects.order_by("id")[:n])


def ensure_sinais_vitais(n: int, registros: list[RegistroEnfermagem]) -> list[SinalVitalEnfermagem]:
    while _count(SinalVitalEnfermagem) < n and registros:
        idx = _count(SinalVitalEnfermagem) + 1
        registro = registros[(idx - 1) % len(registros)]
        with tenant_ctx(registro.inquilino):
            SinalVitalEnfermagem.objects.create(
                inquilino=registro.inquilino,
                nome=f"Sinais Vitais {idx}",
                registro=registro,
                temperatura_c=Decimal("36.5"),
                frequencia_cardiaca=70 + (idx % 20),
                frequencia_respiratoria=18 + (idx % 4),
                saturacao_oxigenio=97,
                pressao_arterial="120/80",
            )
    return list(SinalVitalEnfermagem.objects.order_by("id")[:n])


def ensure_procedimentos(n: int, pacientes: list[Paciente], users: list[Usuario], faker: Faker) -> list[Procedimento]:
    while _count(Procedimento) < n and pacientes:
        idx = _count(Procedimento) + 1
        paciente = pacientes[(idx - 1) % len(pacientes)]
        profissional = users[(idx - 1) % len(users)] if users else None
        with tenant_ctx(paciente.inquilino):
            Procedimento.objects.create(
                inquilino=paciente.inquilino,
                paciente=paciente,
                profissional=profissional,
                observacoes=faker.sentence(nb_words=12),
            )
    return list(Procedimento.objects.order_by("id")[:n])


def ensure_catalogos_procedimento(n: int, tenants: list[Inquilino], faker: Faker) -> list[ProcedimentoCatalogo]:
    while _count(ProcedimentoCatalogo) < n:
        idx = _count(ProcedimentoCatalogo) + 1
        tenant = tenants[(idx - 1) % len(tenants)]
        with tenant_ctx(tenant):
            ProcedimentoCatalogo.objects.create(
                inquilino=tenant,
                nome=f"Procedimento {faker.word().title()} {idx}",
                descricao=f"Descrição seed {idx}",
                preco_padrao=Decimal("350.00") + Decimal(idx),
            )
    return list(ProcedimentoCatalogo.objects.order_by("id")[:n])


def ensure_catalogo_materiais(
    n: int, catalogos: list[ProcedimentoCatalogo], produtos: list[Produto], faker: Faker
) -> None:
    # Gera 1 material padrao por catalogo ate atingir n.
    while _count(ProcedimentoCatalogoMaterial) < n and catalogos and produtos:
        idx = _count(ProcedimentoCatalogoMaterial) + 1
        catalogo = catalogos[(idx - 1) % len(catalogos)]
        produto = next((p for p in produtos if p.inquilino_id == catalogo.inquilino_id), None)
        if produto is None:
            continue
        with tenant_ctx(catalogo.inquilino):
            ProcedimentoCatalogoMaterial.objects.get_or_create(
                catalogo=catalogo,
                produto=produto,
                defaults={
                    "inquilino": catalogo.inquilino,
                    "quantidade_padrao": Decimal("1.00"),
                    "custo_unitario_padrao": produto.preco_venda,
                    "observacao": f"Material padrão seed {idx}",
                },
            )


def ensure_procedimento_itens(
    n: int, procedimentos: list[Procedimento], catalogos: list[ProcedimentoCatalogo]
) -> list[ProcedimentoItem]:
    # Usa catalogo para gerar materiais automaticamente.
    while _count(ProcedimentoItem) < n and procedimentos:
        idx = _count(ProcedimentoItem) + 1
        proc = procedimentos[(idx - 1) % len(procedimentos)]
        catalogo = next((c for c in catalogos if c.inquilino_id == proc.inquilino_id), None)
        with tenant_ctx(proc.inquilino):
            ProcedimentoItem.objects.create(
                inquilino=proc.inquilino,
                procedimento=proc,
                catalogo=catalogo,
                descricao="" if catalogo else f"Serviço seed {idx}",
                quantidade=1,
                preco_unitario=Decimal("0.00"),
                realizado=True,
                observacao="",
            )
    return list(ProcedimentoItem.objects.order_by("id")[:n])


def ensure_evolucoes(n: int, pacientes: list[Paciente], faker: Faker) -> None:
    while _count(EvolucaoEnfermagem) < n and pacientes:
        idx = _count(EvolucaoEnfermagem) + 1
        paciente = pacientes[(idx - 1) % len(pacientes)]
        with tenant_ctx(paciente.inquilino):
            EvolucaoEnfermagem.objects.create(
                inquilino=paciente.inquilino,
                paciente=paciente,
                nome=f"Evolução {idx}",
                observacao=faker.paragraph(nb_sentences=3),
            )


def ensure_prescricoes(n: int, pacientes: list[Paciente], faker: Faker) -> None:
    while _count(PrescricaoEnfermagem) < n and pacientes:
        idx = _count(PrescricaoEnfermagem) + 1
        paciente = pacientes[(idx - 1) % len(pacientes)]
        with tenant_ctx(paciente.inquilino):
            PrescricaoEnfermagem.objects.create(
                inquilino=paciente.inquilino,
                paciente=paciente,
                nome=f"Prescrição {idx}",
                descricao=faker.sentence(nb_words=12),
                ativo=idx % 5 != 0,
            )


def ensure_faturas(
    n: int, requisicoes: list[RequisicaoAnalise], vendas: list[Venda], procedimentos: list[Procedimento]
) -> list[Fatura]:
    # Cria faturas clinico primeiro
    for req in requisicoes:
        Fatura.objects.get_or_create(
            requisicao=req,
            defaults={
                "inquilino": req.inquilino,
                "origem": Fatura.Origem.CLINICO,
                "paciente": req.paciente,
            },
        )

    # Cria faturas de farmacia e enfermagem se faltar para atingir n
    while _count(Fatura) < n and vendas:
        idx = _count(Fatura) + 1
        venda = vendas[(idx - 1) % len(vendas)]
        Fatura.objects.get_or_create(
            venda=venda,
            defaults={
                "inquilino": venda.inquilino,
                "origem": Fatura.Origem.FARMACIA,
            },
        )

    while _count(Fatura) < n and procedimentos:
        idx = _count(Fatura) + 1
        proc = procedimentos[(idx - 1) % len(procedimentos)]
        Fatura.objects.get_or_create(
            procedimento=proc,
            defaults={
                "inquilino": proc.inquilino,
                "origem": Fatura.Origem.ENFERMAGEM,
                "paciente": proc.paciente,
            },
        )

    # Sincroniza itens para todas as faturas em rascunho
    for fatura in Fatura.objects.order_by("id")[:n]:
        if fatura.estado == fatura.Estado.RASCUNHO:
            try:
                fatura.sincronizar_itens_da_origem()
            except Exception:
                # Se alguma origem nao estiver pronta (ex.: venda sem itens), segue adiante.
                continue

    return list(Fatura.objects.order_by("id"))


def ensure_historico_faturas(n: int, faturas: list[Fatura]) -> None:
    while _count(HistoricoFatura) < n and faturas:
        idx = _count(HistoricoFatura) + 1
        fatura = faturas[(idx - 1) % len(faturas)]
        with tenant_ctx(fatura.inquilino):
            HistoricoFatura.objects.create(
                inquilino=fatura.inquilino,
                nome=f"Histórico {idx}",
                fatura=fatura,
                tipo_evento="SEED",
                descricao="Evento de histórico (seed)",
            )


def ensure_pagamentos(n: int, faturas: list[Fatura]) -> list[Pagamento]:
    metodo = _safe_choice_value(Pagamento, "metodo")

    while _count(Pagamento) < n and faturas:
        idx = _count(Pagamento) + 1
        fatura = faturas[(idx - 1) % len(faturas)]
        valor = fatura.total if fatura.total and fatura.total > 0 else Decimal("100.00")
        with tenant_ctx(fatura.inquilino):
            pagamento = Pagamento.objects.create(
                inquilino=fatura.inquilino,
                nome=f"Pagamento {idx}",
                fatura=fatura,
                valor=valor,
                metodo=metodo,
                referencia_externa=f"PG-SEED-{idx:06d}",
            )
            # Emite e confirma alguns pagamentos para gerar recibos automaticamente.
            if idx % 2 == 0 and fatura.estado == fatura.Estado.RASCUNHO:
                with suppress(Exception):
                    fatura.emitir()
            if idx % 3 == 0 and pagamento.status == pagamento.Status.PENDENTE:
                with suppress(Exception):
                    pagamento.confirmar()

    return list(Pagamento.objects.order_by("id")[:n])


def ensure_historico_pagamentos(n: int, pagamentos: list[Pagamento]) -> None:
    while _count(HistoricoPagamento) < n and pagamentos:
        idx = _count(HistoricoPagamento) + 1
        pagamento = pagamentos[(idx - 1) % len(pagamentos)]
        with tenant_ctx(pagamento.inquilino):
            HistoricoPagamento.objects.create(
                inquilino=pagamento.inquilino,
                nome=f"Hist Pag {idx}",
                pagamento=pagamento,
                tipo_evento=HistoricoPagamento.TipoEvento.CRIADO,
                valor=pagamento.valor,
                descricao="Pagamento criado (seed)",
                referencia_externa=pagamento.referencia_externa,
            )


def ensure_transacoes(n: int) -> list[Transacao]:
    while _count(Transacao) < n:
        idx = _count(Transacao) + 1
        Transacao.objects.create(
            referencia_externa=f"TX-SEED-{idx:06d}",
            gateway="SEED_GATEWAY",
            status="confirmada" if idx % 2 == 0 else "pendente",
            resposta_gateway={"seed": idx},
        )
    return list(Transacao.objects.order_by("id")[:n])


def ensure_reconciliacoes(n: int, transacoes: list[Transacao]) -> list[Reconciliacao]:
    while _count(Reconciliacao) < n and transacoes:
        idx = _count(Reconciliacao) + 1
        tx = transacoes[(idx - 1) % len(transacoes)]
        Reconciliacao.objects.get_or_create(
            transacao=tx,
            defaults={
                "confirmado": idx % 2 == 0,
                "data_confirmacao": timezone.now() if idx % 2 == 0 else None,
            },
        )
    return list(Reconciliacao.objects.order_by("id")[:n])


def ensure_recibos(n: int, pagamentos: list[Pagamento]) -> list[Recibo]:
    while _count(Recibo) < n and pagamentos:
        idx = _count(Recibo) + 1
        pag = next((p for p in pagamentos if not Recibo.objects.filter(pagamento=p).exists()), None)
        if pag is None:
            break
        Recibo.objects.create(
            fatura=pag.fatura,
            pagamento=pag,
            numero=f"RCB-SEED-{idx:06d}",
            valor=pag.valor,
        )
    return list(Recibo.objects.order_by("id")[:n])


def ensure_contabilidade(n: int, tenants: list[Inquilino], faturas: list[Fatura]) -> None:
    tipo_conta = _safe_choice_value(Conta, "tipo")

    # Para conseguir gerar Movimentos/LedgerLines, precisamos de pelo menos 2 contas por tenant.
    for tenant in tenants:
        with tenant_ctx(tenant):
            while Conta.objects.filter(inquilino=tenant).count() < 2:
                idx = _count(Conta) + 1
                Conta.objects.create(
                    inquilino=tenant,
                    nome=f"Conta {idx}",
                    tipo=tipo_conta,
                )
    # E garante no mínimo `n` no total (caso `n` seja maior que 2 * tenants).
    while _count(Conta) < n:
        idx = _count(Conta) + 1
        tenant = tenants[(idx - 1) % len(tenants)]
        with tenant_ctx(tenant):
            Conta.objects.create(
                inquilino=tenant,
                nome=f"Conta {idx}",
                tipo=tipo_conta,
            )

    # Precisamos do conjunto completo para garantir 2 contas por tenant na criação de movimentos/linhas.
    contas = list(Conta.objects.order_by("inquilino_id", "id"))

    while _count(Lancamento) < n:
        idx = _count(Lancamento) + 1
        tenant = tenants[(idx - 1) % len(tenants)]
        with tenant_ctx(tenant):
            Lancamento.objects.create(
                inquilino=tenant,
                nome=f"Lançamento {idx}",
                descricao="Lançamento seed",
                referencia_externa=f"LANC-SEED-{idx:06d}",
            )

    lancamentos = list(Lancamento.objects.order_by("id")[:n])

    for idx, lanc in enumerate(lancamentos, start=1):
        contas_tenant = [c for c in contas if c.inquilino_id == lanc.inquilino_id]
        if len(contas_tenant) < 2:
            continue
        debito = contas_tenant[0]
        credito = contas_tenant[-1]

        with tenant_ctx(lanc.inquilino):
            if not Movimento.objects.filter(lancamento=lanc, debito__gt=0).exists():
                Movimento.objects.create(
                    inquilino=lanc.inquilino,
                    nome=f"Mov D {idx}",
                    lancamento=lanc,
                    conta=debito,
                    debito=Decimal("100.00"),
                    credito=Decimal("0.00"),
                )
            if not Movimento.objects.filter(lancamento=lanc, credito__gt=0).exists():
                Movimento.objects.create(
                    inquilino=lanc.inquilino,
                    nome=f"Mov C {idx}",
                    lancamento=lanc,
                    conta=credito,
                    debito=Decimal("0.00"),
                    credito=Decimal("100.00"),
                )

    while _count(LedgerEntry) < n:
        idx = _count(LedgerEntry) + 1
        tenant = tenants[(idx - 1) % len(tenants)]
        with tenant_ctx(tenant):
            LedgerEntry.objects.create(
                inquilino=tenant,
                nome=f"Ledger Entry {idx}",
                referencia_externa=f"LED-REF-{idx:06d}",
                idempotency_key=f"LED-IDEMP-{idx:06d}",
                data_contabil=timezone.localdate(),
                descricao="Entry seed",
            )

    entries = list(LedgerEntry.objects.order_by("id")[:n])

    for idx, entry in enumerate(entries, start=1):
        contas_tenant = [c for c in contas if c.inquilino_id == entry.inquilino_id]
        if len(contas_tenant) < 2:
            continue
        debito = contas_tenant[0]
        credito = contas_tenant[-1]
        with tenant_ctx(entry.inquilino):
            if not LedgerLine.objects.filter(entry=entry, natureza="D").exists():
                LedgerLine.objects.create(
                    inquilino=entry.inquilino,
                    nome=f"LL D {idx}",
                    entry=entry,
                    conta=debito,
                    valor=Decimal("50.00"),
                    natureza="D",
                )
            if not LedgerLine.objects.filter(entry=entry, natureza="C").exists():
                LedgerLine.objects.create(
                    inquilino=entry.inquilino,
                    nome=f"LL C {idx}",
                    entry=entry,
                    conta=credito,
                    valor=Decimal("50.00"),
                    natureza="C",
                )

    for conta in contas:
        SaldoConta.objects.get_or_create(conta=conta)

    # Conciliações financeiras (contabilidade) vinculadas a faturas.
    while _count(ConciliacaoFinanceira) < n and faturas:
        idx = _count(ConciliacaoFinanceira) + 1
        fatura = faturas[(idx - 1) % len(faturas)]
        with tenant_ctx(fatura.inquilino):
            ConciliacaoFinanceira.objects.create(
                inquilino=fatura.inquilino,
                nome=f"Conciliação {idx}",
                fatura=fatura,
                valor_contabil=fatura.total or Decimal("100.00"),
                valor_recebido=fatura.total or Decimal("100.00"),
                referencia_externa=f"CON-SEED-{idx:06d}",
            )


def ensure_seguradora(n: int, tenants: list[Inquilino]) -> None:
    while _count(Seguradora) < n:
        idx = _count(Seguradora) + 1
        tenant = tenants[(idx - 1) % len(tenants)]
        with tenant_ctx(tenant):
            Seguradora.objects.create(
                inquilino=tenant,
                nome=f"Seguradora {idx}",
                descricao="Seguradora seed",
                ordem=idx,
                codigo_externo=f"SEG-{idx:06d}",
                email=f"seg{idx:04d}@example.com",
                telefone=_moz_phone(2000 + idx),
                ativa=True,
            )

    seguradoras = list(Seguradora.objects.order_by("id")[: max(n, 1)])

    while _count(PlanoCobertura) < n:
        idx = _count(PlanoCobertura) + 1
        seg = seguradoras[(idx - 1) % len(seguradoras)]
        with tenant_ctx(seg.inquilino):
            PlanoCobertura.objects.create(
                inquilino=seg.inquilino,
                nome=f"Plano Cobertura {idx}",
                descricao="Plano seed",
                ordem=idx,
                seguradora=seg,
                percentual_cobertura=Decimal("80.00"),
                exige_autorizacao=idx % 2 == 0,
                ativo=True,
            )

    planos = list(PlanoCobertura.objects.order_by("id")[: max(n, 1)])

    # Overrides por tenant
    while _count(TenantPlanoCobertura) < n:
        idx = _count(TenantPlanoCobertura) + 1
        tenant = tenants[(idx - 1) % len(tenants)]
        plano_global = planos[(idx - 1) % len(planos)]
        with tenant_ctx(tenant):
            TenantPlanoCobertura.objects.get_or_create(
                inquilino=tenant,
                plano_global=plano_global,
                defaults={
                    "nome": f"Override {idx}",
                    "descricao": "Override seed",
                    "ordem": idx,
                    "percentual_override": Decimal("75.00") if idx % 2 == 0 else None,
                    "ativo": True,
                },
            )

    # Autorizações
    requisicoes = list(RequisicaoAnalise.objects.order_by("id")[: max(n, 1)])
    while _count(AutorizacaoProcedimento) < n and planos and requisicoes:
        idx = _count(AutorizacaoProcedimento) + 1
        plano = planos[(idx - 1) % len(planos)]
        req = requisicoes[(idx - 1) % len(requisicoes)]
        with tenant_ctx(plano.inquilino):
            AutorizacaoProcedimento.objects.create(
                inquilino=plano.inquilino,
                nome=f"Autorização {idx}",
                descricao="Autorização seed",
                ordem=idx,
                requisicao_id=req.id_custom or str(req.id),
                plano=plano,
                status=AutorizacaoProcedimento.Status.PENDENTE,
                codigo_autorizacao=f"AUT-{idx:06d}",
            )


def ensure_notificacoes(n: int, pacientes: list[Paciente], faker: Faker) -> None:
    while TemplateNotificacao.objects.count() < n:
        idx = TemplateNotificacao.objects.count() + 1
        TemplateNotificacao.objects.create(
            nome=f"Template {idx}",
            conteudo=faker.text(max_nb_chars=200),
        )

    templates = list(TemplateNotificacao.objects.order_by("id")[:n])

    while Notificacao.objects.count() < n:
        idx = Notificacao.objects.count() + 1
        paciente = pacientes[(idx - 1) % len(pacientes)] if pacientes else None
        tpl = templates[(idx - 1) % len(templates)] if templates else None
        msg = faker.sentence(nb_words=12)
        if tpl:
            msg = f"[{tpl.nome}] {msg}"
        Notificacao.objects.create(
            paciente=paciente,
            destinatario=f"destinatario{idx:04d}@example.com",
            canal=Notificacao.Canal.EMAIL,
            assunto=f"Notificação {idx}",
            tipo_evento=Notificacao.TipoEvento.GENERICA,
            referencia_externa=f"NTF-SEED-{idx:06d}",
            mensagem=msg,
            enviada=idx % 2 == 0,
            enviado_em=timezone.now() if idx % 2 == 0 else None,
        )

    notifs = list(Notificacao.objects.order_by("id")[:n])
    while LogEnvio.objects.count() < n and notifs:
        idx = LogEnvio.objects.count() + 1
        notif = notifs[(idx - 1) % len(notifs)]
        LogEnvio.objects.create(
            notificacao=notif,
            status="enviado" if notif.enviada else "pendente",
            resposta=f"Resposta seed {idx}",
        )


def ensure_checkins(
    n: int,
    pacientes: list[Paciente],
    users: list[Usuario],
    requisicoes: list[RequisicaoAnalise],
    faturas: list[Fatura],
    faker: Faker,
) -> None:
    while _count(CheckinRecepcao) < n and pacientes:
        idx = _count(CheckinRecepcao) + 1
        paciente = pacientes[(idx - 1) % len(pacientes)]
        atendente = users[(idx - 1) % len(users)] if users else None
        req = requisicoes[(idx - 1) % len(requisicoes)] if requisicoes else None
        fat = None
        if faturas and req is not None:
            fat = next((f for f in faturas if f.requisicao_id == req.id), None)
        with tenant_ctx(paciente.inquilino):
            CheckinRecepcao.objects.create(
                inquilino=paciente.inquilino,
                paciente=paciente,
                requisicao=req if idx % 2 == 0 else None,
                fatura=fat if idx % 3 == 0 else None,
                atendente=atendente,
                prioridade=random.choice([c[0] for c in CheckinRecepcao.Prioridade.choices]),
                estado=random.choice([c[0] for c in CheckinRecepcao.Estado.choices]),
                motivo=faker.sentence(nb_words=8),
                observacoes=faker.sentence(nb_words=12),
            )


def report(minimo: int) -> None:
    faltando: list[str] = []
    app_configs = sorted(
        [cfg for cfg in apps.get_app_configs() if cfg.name.startswith("aplicativos.")],
        key=lambda c: c.label,
    )
    for cfg in app_configs:
        for model in cfg.get_models():
            if model._meta.abstract or model._meta.proxy:
                continue
            qtd = model.objects.count()
            if qtd < minimo:
                faltando.append(f"{cfg.label}.{model.__name__} ({qtd})")

    if faltando:
        for _item in faltando:
            pass
    else:
        pass


class Command(BaseCommand):
    help = "Gera dados hipotéticos (demo) no banco (10 por app/model por padrão)."

    def add_arguments(self, parser):
        parser.add_argument("--n", type=int, default=10, help="Mínimo de registros por modelo.")
        parser.add_argument(
            "--password",
            default="Seed@123456",
            help="Senha para os usuários seed criados por este comando.",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        n: int = int(options["n"])
        password: str = str(options["password"])

        # Evita poluir o output com logs DEBUG do Faker quando o projeto está em DEBUG.
        import logging

        logging.getLogger("faker").setLevel(logging.WARNING)
        logging.getLogger("faker.factory").setLevel(logging.WARNING)

        # Determinismo basico para reprodutibilidade.
        random.seed(260313)

        from faker import Faker

        try:
            faker = Faker("pt_PT")
        except Exception:
            faker = Faker()

        tenants = ensure_inquilinos(n, faker)
        ensure_config_uso(tenants)
        planos = ensure_planos_assinatura(n)
        ensure_assinaturas(n, tenants, planos)
        ensure_feature_flags(n, tenants)

        users = ensure_usuarios(n, tenants, password, faker)
        ensure_perfis_profissionais(users, faker)
        ensure_password_reset_tokens(n, users)

        categorias = ensure_categorias_produto(n, tenants, faker)
        produtos = ensure_produtos(n, tenants, categorias, faker)
        lotes = ensure_lotes(n, produtos)
        vendas = ensure_vendas(n, tenants)
        ensure_itens_venda(n, vendas, produtos)
        ensure_movimentos_estoque(n, lotes)

        exames = ensure_exames(n, tenants, faker)
        campos = ensure_exame_campos(n, exames, faker)
        exames_med = ensure_exames_medicos(n, tenants, faker)
        ensure_exame_medico_campos(n, exames_med, faker)
        pacientes = ensure_pacientes(n, tenants, faker)
        requisicoes = ensure_requisicoes(n, pacientes, users)
        ensure_requisicao_itens(n, requisicoes, exames, exames_med)
        ensure_resultados(requisicoes, users)
        ensure_referencias(n, campos, faker)
        ensure_valores_resultado(n)
        ensure_eventos_clinicos(n, pacientes, requisicoes)
        ensure_historico_clinico(n, pacientes, faker)

        registros = ensure_registros_enfermagem(n, pacientes, faker)
        ensure_sinais_vitais(n, registros)
        procedimentos = ensure_procedimentos(n, pacientes, users, faker)
        catalogos = ensure_catalogos_procedimento(n, tenants, faker)
        ensure_catalogo_materiais(n, catalogos, produtos, faker)
        ensure_procedimento_itens(n, procedimentos, catalogos)
        # ProcedimentoItem cria materiais automaticamente (e movimentos), garantindo ProcedimentoMaterial/valor.
        _ = list(ProcedimentoMaterial.objects.order_by("id")[:n])
        ensure_evolucoes(n, pacientes, faker)
        ensure_prescricoes(n, pacientes, faker)

        faturas = ensure_faturas(n, requisicoes, vendas, procedimentos)
        ensure_historico_faturas(n, faturas)

        # Recepcao usa requisicoes/faturas
        ensure_checkins(n, pacientes, users, requisicoes, faturas, faker)

        pagamentos = ensure_pagamentos(n, faturas)
        ensure_historico_pagamentos(n, pagamentos)
        transacoes = ensure_transacoes(n)
        ensure_reconciliacoes(n, transacoes)
        ensure_recibos(n, pagamentos)

        ensure_contabilidade(n, tenants, faturas)
        ensure_seguradora(n, tenants)
        ensure_notificacoes(n, pacientes, faker)

        report(n)
