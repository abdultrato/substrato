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

from apps.clinical.models.clinical_event import ClinicalEvent
from apps.clinical.models.lab_exam import LabExam
from apps.clinical.models.lab_exam_field import LabExamField
from apps.clinical.models.medical_exam import MedicalExam, MedicalExamField
from apps.clinical.models.clinical_history import ClinicalHistory
from apps.clinical.models.patient import Patient
from apps.clinical.models.clinical_reference import ClinicalReference
from apps.clinical.models.lab_request import LabRequest
from apps.clinical.models.lab_request_item import LabRequestItem
from apps.clinical.models.result import Result
from apps.clinical.models.result_item import ResultItem
from apps.accounting.models.financial_reconciliation import FinancialReconciliation
from apps.accounting.models.account import Account
from apps.accounting.models.legacy_entry import LegacyEntry
from apps.accounting.models.ledger_entry import LedgerEntry
from apps.accounting.models.ledger_line import LedgerLine
from apps.accounting.models.legacy_movement import LegacyMovement
from apps.accounting.models.account_balance import AccountBalance
from apps.nursing.models import (
    NursingEvolution,
    NursingPrescription,
    Procedure,
    ProcedureCatalog,
    ProcedureCatalogMaterial,
    ProcedureItem,
    ProcedureMaterial,
    NursingRecord,
    NursingVitalSign,
)
from apps.pharmacy.models.product_category import ProductCategory
from apps.pharmacy.models.sale_item import SaleItem
from apps.pharmacy.models.lot import Lot
from apps.pharmacy.models.inventory_movement import InventoryMovement, OrigemMovimento, TipoMovimento
from apps.pharmacy.models.product import Product
from apps.pharmacy.models.sale import Sale
from apps.billing.models.invoice import Invoice
from apps.billing.models.invoice_history import InvoiceHistory
from apps.identity.models.password_reset_token import PasswordResetToken
from apps.identity.models.professional_profile import ProfessionalProfile
from apps.identity.models.user import User
from apps.tenants.models.subscription import TenantSubscription
from apps.tenants.models.configuration import TenantConfiguration
from apps.tenants.models.feature_flags import TenantFeatureFlag
from apps.tenants.models.tenant import Tenant
from apps.tenants.models.subscription_plan import SubscriptionPlan
from apps.tenants.models.tenant_usage import TenantUsage
from apps.notifications.models.delivery_log import DeliveryLog
from apps.notifications.models.notification import Notification
from apps.notifications.models.notification_template import NotificationTemplate
from apps.payments.models.payment_history import PaymentHistory
from apps.payments.models.payment import Payment
from apps.payments.models.receipt import Receipt
from apps.payments.models.reconciliation import Reconciliation
from apps.payments.models.transaction import Transaction
from apps.reception.models.reception_checkin import ReceptionCheckin
from apps.insurer.models.procedure_authorization import ProcedureAuthorization
from apps.insurer.models.coverage_plan import CoveragePlan
from apps.insurer.models.insurer import Insurer
from apps.insurer.models.tenant_coverage_plan import TenantCoveragePlan
from infrastructure.context.tenant import reset_tenant, set_tenant
from core.constants.clinical_event_type import TipoEventoClinico


@contextmanager
def tenant_ctx(tenant: Tenant):
    token = set_tenant(tenant)
    try:
        yield
    finally:
        reset_tenant(token)


def _count(model) -> int:
    return model.objects.count()


def _needed(model, n: int) -> int:
    return max(0, n - _count(model))


def _moz_phone(i: int) -> str:
    # PhoneField valida 9 digitos e prefixos 82..87 (Moçambique).
    # Gera algo como: 84xxxxxxx
    return f"84{i:07d}"


def _safe_choice_value(model, field_name: str):
    choices = list(model._meta.get_field(field_name).choices)
    return choices[0][0] if choices else None


def _ensure_local_tenant() -> Tenant:
    tenant = Tenant.objects.filter(identificador="local").order_by("id").first()
    if tenant:
        return tenant
    return Tenant.objects.create(
        identificador="local",
        nome="Tenant Local",
        dominio="localhost",
        ativo=True,
        status_comercial=Tenant.StatusComercial.TRIAL,
    )


def ensure_tenants(n: int, faker: Faker) -> list[Tenant]:
    tenants: list[Tenant] = []
    tenants.append(_ensure_local_tenant())

    while len(tenants) < n:
        idx = len(tenants) + 1
        identificador = f"seed-tenant-{idx:04d}"
        obj, created = Tenant.objects.get_or_create(
            identificador=identificador,
            defaults={
                "nome": f"Clínica {faker.city()} {idx}",
                "dominio": f"tenant{idx}.localhost",
                "ativo": True,
                "status_comercial": Tenant.StatusComercial.TRIAL,
                "trial_ate": timezone.localdate() + timedelta(days=30),
            },
        )
        if created:
            tenants.append(obj)
        else:
            tenants.append(obj)

    return list(Tenant.objects.order_by("id")[:n])


def ensure_config_uso(tenants: Iterable[Tenant]) -> None:
    for idx, tenant in enumerate(tenants, start=1):
        TenantConfiguration.objects.get_or_create(
            inquilino=tenant,
            defaults={
                "fuso_horario": "Africa/Maputo",
                "moeda": "MZN",
                "idioma": "pt",
                "permite_multi_unidade": idx % 2 == 0,
                "limite_usuarios": 10 + idx,
            },
        )
        TenantUsage.objects.get_or_create(
            inquilino=tenant,
            defaults={
                "usuarios_ativos": 3 + idx,
                "requisicoes_mes_atual": 20 * idx,
            },
        )


def ensure_subscription_plans(n: int) -> list[SubscriptionPlan]:
    tipos = [c[0] for c in SubscriptionPlan.TipoPlano.choices]
    while _count(SubscriptionPlan) < n:
        idx = _count(SubscriptionPlan) + 1
        tipo = tipos[(idx - 1) % len(tipos)]
        SubscriptionPlan.objects.create(
            nome=f"Plano {tipo} {idx}",
            descricao=f"Plano de assinatura seed ({tipo})",
            ordem=idx,
            tipo=tipo,
            limite_usuarios=5 + idx,
            limite_requisicoes_mes=1000 + 10 * idx,
            preco_mensal=Decimal("0.00") if tipo == SubscriptionPlan.TipoPlano.FREE else Decimal("1990.00"),
            preco_excedente_requisicao=Decimal("5.00"),
            suporte_prioritario=tipo == SubscriptionPlan.TipoPlano.PRO,
            permite_multi_unidade=tipo != SubscriptionPlan.TipoPlano.FREE,
            ativo=True,
        )
    return list(SubscriptionPlan.objects.order_by("id")[:n])


def ensure_assinaturas(n: int, tenants: list[Tenant], planos: list[SubscriptionPlan]) -> None:
    # Garante pelo menos 1 assinatura por tenant (e no minimo n no total).
    for idx, tenant in enumerate(tenants, start=1):
        if not TenantSubscription.objects.filter(inquilino=tenant).exists():
            plano = planos[(idx - 1) % len(planos)]
            TenantSubscription.objects.create(
                inquilino=tenant,
                plano=plano,
                status=TenantSubscription.Status.ATIVA,
                ciclo=TenantSubscription.Ciclo.MENSAL,
                data_inicio=timezone.localdate() - timedelta(days=10 * idx),
            )

    while _count(TenantSubscription) < n:
        idx = _count(TenantSubscription) + 1
        tenant = tenants[(idx - 1) % len(tenants)]
        plano = planos[(idx - 1) % len(planos)]
        TenantSubscription.objects.create(
            inquilino=tenant,
            plano=plano,
            status=TenantSubscription.Status.ATIVA,
            ciclo=TenantSubscription.Ciclo.MENSAL,
            data_inicio=timezone.localdate() - timedelta(days=idx),
        )


def ensure_feature_flags(n: int, tenants: list[Tenant]) -> None:
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
    while _count(TenantFeatureFlag) < n:
        idx = _count(TenantFeatureFlag) + 1
        tenant = tenants[(idx - 1) % len(tenants)]
        chave = f"{chaves_base[(idx - 1) % len(chaves_base)]}_{idx:02d}"
        TenantFeatureFlag.objects.get_or_create(
            inquilino=tenant,
            chave=chave,
            defaults={"ativo": idx % 3 != 0},
        )


def ensure_users(n: int, tenants: list[Tenant], password: str, faker: Faker) -> list[User]:
    while User.objects.count() < n:
        idx = User.objects.count() + 1
        tenant = tenants[(idx - 1) % len(tenants)]
        username = f"seeduser{idx:04d}"
        email = f"{username}@example.com"

        if User.objects.filter(username=username).exists() or User.objects.filter(email=email).exists():
            # Fallback: garante unicidade mesmo com dados existentes.
            suf = timezone.now().strftime("%H%M%S")
            username = f"{username}_{suf}"
            email = f"{username}@example.com"

        first_name = faker.first_name()
        last_name = faker.last_name()

        User.objects.create_user(
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

    return list(User.objects.order_by("id")[:n])


def ensure_professional_profiles(users: list[User], faker: Faker) -> None:
    for idx, user in enumerate(users, start=1):
        ProfessionalProfile.objects.get_or_create(
            usuario=user,
            defaults={
                "cargo": random.choice(["Analista", "Enfermeiro", "Recepcionista", "Farmacêutico"]),
                "registro_profissional": f"REG-{idx:06d}",
                "departamento": random.choice(["Laboratório", "Recepção", "Enfermagem", "Farmácia"]),
            },
        )


def ensure_password_reset_tokens(n: int, users: list[User]) -> None:
    while PasswordResetToken.objects.count() < n:
        idx = PasswordResetToken.objects.count() + 1
        user = users[(idx - 1) % len(users)]
        PasswordResetToken.objects.create(user=user)


def ensure_product_categories(n: int, tenants: list[Tenant], faker: Faker) -> list[ProductCategory]:
    # CategoriaProduto possui unique (inquilino, nome)
    while _count(ProductCategory) < n:
        idx = _count(ProductCategory) + 1
        tenant = tenants[(idx - 1) % len(tenants)]
        with tenant_ctx(tenant):
            nome = f"Categoria {faker.word().title()} {idx}"
            ProductCategory.objects.get_or_create(
                inquilino=tenant,
                nome=nome,
                defaults={"descricao": f"Categoria seed {idx}"},
            )

    return list(ProductCategory.objects.order_by("id")[:n])


def ensure_produtos(
    n: int, tenants: list[Tenant], categorias: list[ProductCategory], faker: Faker
) -> list[Product]:
    tipos = [c[0] for c in Product.TipoProduto.choices]

    while _count(Product) < n:
        idx = _count(Product) + 1
        tenant = tenants[(idx - 1) % len(tenants)]
        categoria = next((c for c in categorias if c.inquilino_id == tenant.id), None)
        with tenant_ctx(tenant):
            Product.objects.create(
                inquilino=tenant,
                nome=f"{faker.word().title()} {faker.word().title()} {idx}",
                categoria=categoria,
                tipo=tipos[(idx - 1) % len(tipos)],
                preco_venda=Decimal("25.00") + Decimal(idx),
            )

    return list(Product.objects.order_by("id")[:n])


def ensure_lotes(n: int, produtos: list[Product]) -> list[Lot]:
    while _count(Lot) < n:
        idx = _count(Lot) + 1
        produto = produtos[(idx - 1) % len(produtos)]
        numero_lote = f"SEED-{produto.id or 0}-{idx:04d}"
        with tenant_ctx(produto.inquilino):
            if Lot.objects.filter(produto=produto, numero_lote=numero_lote).exists():
                continue
            Lot.objects.create(
                inquilino=produto.inquilino,
                produto=produto,
                numero_lote=numero_lote,
                validade=timezone.localdate() + timedelta(days=365 + idx),
                quantidade_inicial=1000,
            )
    return list(Lot.objects.order_by("id")[:n])


def ensure_vendas(n: int, tenants: list[Tenant]) -> list[Sale]:
    while _count(Sale) < n:
        idx = _count(Sale) + 1
        tenant = tenants[(idx - 1) % len(tenants)]
        with tenant_ctx(tenant):
            numero = f"VEND-SEED-{tenant.id}-{idx:06d}"
            if Sale.objects.filter(inquilino=tenant, numero=numero).exists():
                continue
            Sale.objects.create(
                inquilino=tenant,
                numero=numero,
            )
    return list(Sale.objects.order_by("id")[:n])


def ensure_itens_venda(n: int, vendas: list[Sale], produtos: list[Product]) -> list[SaleItem]:
    # Cria itens garantindo estoque (ItemVenda baixa do lote automaticamente).
    while _count(SaleItem) < n:
        idx = _count(SaleItem) + 1
        venda = vendas[(idx - 1) % len(vendas)]

        produtos_tenant = [p for p in produtos if p.inquilino_id == venda.inquilino_id]
        if not produtos_tenant:
            break

        # Escolhe um produto que não esteja na venda.
        produto = next(
            (
                p
                for p in produtos_tenant
                if not SaleItem.objects.filter(venda=venda, produto=p, deletado=False).exists()
            ),
            None,
        )
        if produto is None:
            continue

        with tenant_ctx(venda.inquilino):
            SaleItem.objects.create(
                inquilino=venda.inquilino,
                venda=venda,
                produto=produto,
                quantidade=1,
            )
    return list(SaleItem.objects.order_by("id")[:n])


def ensure_inventory_movements(n: int, lotes: list[Lot]) -> None:
    # MovimentoEstoque ja e criado por vendas/procedimentos. Este passo so completa se faltar.
    while _count(InventoryMovement) < n and lotes:
        idx = _count(InventoryMovement) + 1
        lote = lotes[(idx - 1) % len(lotes)]
        with tenant_ctx(lote.inquilino):
            InventoryMovement.objects.create(
                inquilino=lote.inquilino,
                lote=lote,
                tipo=TipoMovimento.ENTRADA,
                origem=OrigemMovimento.AJUSTE,
                quantidade=5,
            )


def ensure_exams(n: int, tenants: list[Tenant], faker: Faker) -> list[LabExam]:
    metodo = _safe_choice_value(LabExam, "metodo")
    setor = _safe_choice_value(LabExam, "setor")

    while _count(LabExam) < n:
        idx = _count(LabExam) + 1
        tenant = tenants[(idx - 1) % len(tenants)]
        with tenant_ctx(tenant):
            LabExam.objects.create(
                inquilino=tenant,
                nome=f"{faker.word().title()} {faker.word().title()} ({idx})",
                trl_horas=24 + (idx % 24),
                preco=Decimal("150.00") + Decimal(idx),
                metodo=metodo,
                setor=setor,
            )
    return list(LabExam.objects.order_by("id")[:n])


def ensure_exam_fields(n: int, exames: list[LabExam], faker: Faker) -> list[LabExamField]:
    tipo = _safe_choice_value(LabExamField, "tipo")
    unidade = _safe_choice_value(LabExamField, "unidade")

    while _count(LabExamField) < n:
        idx = _count(LabExamField) + 1
        exame = exames[(idx - 1) % len(exames)]
        with tenant_ctx(exame.inquilino):
            LabExamField.objects.create(
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
    return list(LabExamField.objects.order_by("id")[:n])


def ensure_medical_exams(n: int, tenants: list[Tenant], faker: Faker) -> list[MedicalExam]:
    metodo = _safe_choice_value(MedicalExam, "metodo")
    setor = _safe_choice_value(MedicalExam, "setor")

    while _count(MedicalExam) < n:
        idx = _count(MedicalExam) + 1
        tenant = tenants[(idx - 1) % len(tenants)]
        with tenant_ctx(tenant):
            MedicalExam.objects.create(
                inquilino=tenant,
                nome=f"Exame Imagem {faker.word().title()} {idx}",
                trl_horas=24 + (idx % 24),
                preco=Decimal("500.00") + Decimal(5 * idx),
                metodo=metodo,
                setor=setor,
            )
    return list(MedicalExam.objects.order_by("id")[:n])


def ensure_medical_exam_fields(n: int, exames: list[MedicalExam], faker: Faker) -> list[MedicalExamField]:
    while _count(MedicalExamField) < n:
        idx = _count(MedicalExamField) + 1
        exame = exames[(idx - 1) % len(exames)]
        tipos_permitidos = list(exame.tipos_resultado_permitidos)
        tipo = random.choice(tipos_permitidos) if tipos_permitidos else _safe_choice_value(MedicalExamField, "tipo")
        with tenant_ctx(exame.inquilino):
            MedicalExamField.objects.create(
                inquilino=exame.inquilino,
                exame=exame,
                nome=f"Parâmetro {faker.word().title()} {idx}",
                tipo=tipo,
            )
    return list(MedicalExamField.objects.order_by("id")[:n])


def ensure_patients(n: int, tenants: list[Tenant], faker: Faker) -> list[Patient]:
    genero = _safe_choice_value(Patient, "genero")
    raca = _safe_choice_value(Patient, "raca_origem")
    tipo_documento = _safe_choice_value(Patient, "tipo_documento")
    proveniencia = _safe_choice_value(Patient, "proveniencia")

    while _count(Patient) < n:
        idx = _count(Patient) + 1
        tenant = tenants[(idx - 1) % len(tenants)]
        nome = faker.name()
        email = f"paciente{idx:04d}@example.com"
        numero_id = f"SEED-BI-{idx:06d}"
        with tenant_ctx(tenant):
            Patient.objects.create(
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
    return list(Patient.objects.order_by("id")[:n])


def ensure_requests(n: int, pacientes: list[Patient], users: list[User]) -> list[LabRequest]:
    while _count(LabRequest) < n:
        idx = _count(LabRequest) + 1
        paciente = pacientes[(idx - 1) % len(pacientes)]
        analista = users[(idx - 1) % len(users)]
        with tenant_ctx(paciente.inquilino):
            LabRequest.objects.create(
                paciente=paciente,
                analista=analista,
            )
    return list(LabRequest.objects.order_by("id")[:n])


def ensure_request_items(
    n: int, requisicoes: list[LabRequest], exames: list[LabExam], exames_medicos: list[MedicalExam]
) -> None:
    # Garante pelo menos 1 exame laboratorial por requisição (gera `ResultadoItem` e itens de fatura).
    for req in requisicoes:
        if LabRequestItem.objects.filter(requisicao=req, exame__isnull=False, deletado=False).exists():
            continue
        exame = next((e for e in exames if e.inquilino_id == req.inquilino_id), None)
        if exame is None:
            continue
        with tenant_ctx(req.inquilino):
            if not LabRequestItem.objects.filter(requisicao=req, exame=exame).exists():
                LabRequestItem.objects.create(requisicao=req, exame=exame)

    # Completa o total de itens (opcionalmente incluindo exames médicos) até atingir `n`.
    while _count(LabRequestItem) < n and requisicoes:
        idx = _count(LabRequestItem) + 1
        req = requisicoes[(idx - 1) % len(requisicoes)]
        with tenant_ctx(req.inquilino):
            # Alterna para incluir alguns exames médicos sem quebrar resultado/faturamento.
            if idx % 3 == 0 and exames_medicos:
                exame_med = next((e for e in exames_medicos if e.inquilino_id == req.inquilino_id), None)
                if exame_med is None:
                    continue
                if LabRequestItem.objects.filter(requisicao=req, exame_medico=exame_med).exists():
                    continue
                LabRequestItem.objects.create(requisicao=req, exame_medico=exame_med)
                continue

            exame = next((e for e in exames if e.inquilino_id == req.inquilino_id), None)
            if exame is None:
                continue
            if LabRequestItem.objects.filter(requisicao=req, exame=exame).exists():
                continue
            LabRequestItem.objects.create(requisicao=req, exame=exame)


def ensure_results(requisicoes: list[LabRequest], users: list[User]) -> list[Result]:
    for idx, req in enumerate(requisicoes, start=1):
        Result.objects.get_or_create(
            requisicao=req,
            defaults={
                "inquilino": req.inquilino,
                "analista": users[(idx - 1) % len(users)],
            },
        )
    return list(Result.objects.order_by("id"))


def ensure_referencias(n: int, campos: list[LabExamField], faker: Faker) -> list[ClinicalReference]:
    while _count(ClinicalReference) < n and campos:
        idx = _count(ClinicalReference) + 1
        campo = campos[(idx - 1) % len(campos)]
        with tenant_ctx(campo.inquilino):
            ClinicalReference.objects.create(
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
    return list(ClinicalReference.objects.order_by("id")[:n])


def ensure_result_values(n: int) -> None:
    # Preenche alguns valores para ficar mais "real" (sem forcar validacao).
    itens = list(ResultItem.objects.filter(resultado_valor__isnull=True).order_by("id")[:n])
    for idx, item in enumerate(itens, start=1):
        with tenant_ctx(item.inquilino):
            item.resultado_valor = Decimal("6.00") + Decimal(idx % 3)
            item.save(update_fields=["resultado_valor"])


def ensure_clinical_events(n: int, pacientes: list[Patient], requisicoes: list[LabRequest]) -> None:
    while _count(ClinicalEvent) < n and pacientes and requisicoes:
        idx = _count(ClinicalEvent) + 1
        req = requisicoes[(idx - 1) % len(requisicoes)]
        paciente = req.paciente
        with tenant_ctx(req.inquilino):
            ClinicalEvent.objects.create(
                inquilino=req.inquilino,
                paciente=paciente,
                requisicao=req,
                tipo_evento=TipoEventoClinico.REQUISICAO_CRIADA,
                descricao=f"Evento clínico seed para {paciente.nome}.",
                nome=f"Evento {idx}",
            )


def ensure_clinical_history(n: int, pacientes: list[Patient], faker: Faker) -> None:
    while ClinicalHistory.objects.count() < n and pacientes:
        idx = ClinicalHistory.objects.count() + 1
        paciente = pacientes[(idx - 1) % len(pacientes)]
        ClinicalHistory.objects.create(
            paciente=paciente,
            descricao=f"Histórico clínico: {faker.sentence(nb_words=10)}",
        )


def ensure_nursing_records(n: int, pacientes: list[Patient], faker: Faker) -> list[NursingRecord]:
    prioridade = _safe_choice_value(NursingRecord, "prioridade")
    while _count(NursingRecord) < n and pacientes:
        idx = _count(NursingRecord) + 1
        paciente = pacientes[(idx - 1) % len(pacientes)]
        with tenant_ctx(paciente.inquilino):
            NursingRecord.objects.create(
                inquilino=paciente.inquilino,
                nome=f"Registro Enfermagem {idx}",
                paciente=paciente,
                prioridade=prioridade,
                observacao=faker.sentence(nb_words=12),
            )
    return list(NursingRecord.objects.order_by("id")[:n])


def ensure_signals_vitais(n: int, registros: list[NursingRecord]) -> list[NursingVitalSign]:
    while _count(NursingVitalSign) < n and registros:
        idx = _count(NursingVitalSign) + 1
        registro = registros[(idx - 1) % len(registros)]
        with tenant_ctx(registro.inquilino):
            NursingVitalSign.objects.create(
                inquilino=registro.inquilino,
                nome=f"Sinais Vitais {idx}",
                registro=registro,
                temperatura_c=Decimal("36.5"),
                frequencia_cardiaca=70 + (idx % 20),
                frequencia_respiratoria=18 + (idx % 4),
                saturacao_oxigenio=97,
                pressao_arterial="120/80",
            )
    return list(NursingVitalSign.objects.order_by("id")[:n])


def ensure_procedimentos(n: int, pacientes: list[Patient], users: list[User], faker: Faker) -> list[Procedure]:
    while _count(Procedure) < n and pacientes:
        idx = _count(Procedure) + 1
        paciente = pacientes[(idx - 1) % len(pacientes)]
        profissional = users[(idx - 1) % len(users)] if users else None
        with tenant_ctx(paciente.inquilino):
            Procedure.objects.create(
                inquilino=paciente.inquilino,
                paciente=paciente,
                profissional=profissional,
                observacoes=faker.sentence(nb_words=12),
            )
    return list(Procedure.objects.order_by("id")[:n])


def ensure_catalogos_procedimento(n: int, tenants: list[Tenant], faker: Faker) -> list[ProcedureCatalog]:
    while _count(ProcedureCatalog) < n:
        idx = _count(ProcedureCatalog) + 1
        tenant = tenants[(idx - 1) % len(tenants)]
        with tenant_ctx(tenant):
            ProcedureCatalog.objects.create(
                inquilino=tenant,
                nome=f"Procedimento {faker.word().title()} {idx}",
                descricao=f"Descrição seed {idx}",
                preco_padrao=Decimal("350.00") + Decimal(idx),
            )
    return list(ProcedureCatalog.objects.order_by("id")[:n])


def ensure_catalogo_materiais(
    n: int, catalogos: list[ProcedureCatalog], produtos: list[Product], faker: Faker
) -> None:
    # Gera 1 material padrao por catalogo ate atingir n.
    while _count(ProcedureCatalogMaterial) < n and catalogos and produtos:
        idx = _count(ProcedureCatalogMaterial) + 1
        catalogo = catalogos[(idx - 1) % len(catalogos)]
        produto = next((p for p in produtos if p.inquilino_id == catalogo.inquilino_id), None)
        if produto is None:
            continue
        with tenant_ctx(catalogo.inquilino):
            ProcedureCatalogMaterial.objects.get_or_create(
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
    n: int, procedimentos: list[Procedure], catalogos: list[ProcedureCatalog]
) -> list[ProcedureItem]:
    # Usa catalogo para gerar materiais automaticamente.
    while _count(ProcedureItem) < n and procedimentos:
        idx = _count(ProcedureItem) + 1
        proc = procedimentos[(idx - 1) % len(procedimentos)]
        catalogo = next((c for c in catalogos if c.inquilino_id == proc.inquilino_id), None)
        with tenant_ctx(proc.inquilino):
            ProcedureItem.objects.create(
                inquilino=proc.inquilino,
                procedimento=proc,
                catalogo=catalogo,
                descricao="" if catalogo else f"Serviço seed {idx}",
                quantidade=1,
                preco_unitario=Decimal("0.00"),
                realizado=True,
                observacao="",
            )
    return list(ProcedureItem.objects.order_by("id")[:n])


def ensure_evolucoes(n: int, pacientes: list[Patient], faker: Faker) -> None:
    while _count(NursingEvolution) < n and pacientes:
        idx = _count(NursingEvolution) + 1
        paciente = pacientes[(idx - 1) % len(pacientes)]
        with tenant_ctx(paciente.inquilino):
            NursingEvolution.objects.create(
                inquilino=paciente.inquilino,
                paciente=paciente,
                nome=f"Evolução {idx}",
                observacao=faker.paragraph(nb_sentences=3),
            )


def ensure_prescricoes(n: int, pacientes: list[Patient], faker: Faker) -> None:
    while _count(NursingPrescription) < n and pacientes:
        idx = _count(NursingPrescription) + 1
        paciente = pacientes[(idx - 1) % len(pacientes)]
        with tenant_ctx(paciente.inquilino):
            NursingPrescription.objects.create(
                inquilino=paciente.inquilino,
                paciente=paciente,
                nome=f"Prescrição {idx}",
                descricao=faker.sentence(nb_words=12),
                ativo=idx % 5 != 0,
            )


def ensure_invoices(
    n: int, requisicoes: list[LabRequest], vendas: list[Sale], procedimentos: list[Procedure]
) -> list[Invoice]:
    # Cria faturas clinico primeiro
    for req in requisicoes:
        Invoice.objects.get_or_create(
            requisicao=req,
            defaults={
                "inquilino": req.inquilino,
                "origem": Invoice.Origem.CLINICO,
                "paciente": req.paciente,
            },
        )

    # Cria faturas de farmacia e enfermagem se faltar para atingir n
    while _count(Invoice) < n and vendas:
        idx = _count(Invoice) + 1
        venda = vendas[(idx - 1) % len(vendas)]
        Invoice.objects.get_or_create(
            venda=venda,
            defaults={
                "inquilino": venda.inquilino,
                "origem": Invoice.Origem.FARMACIA,
            },
        )

    while _count(Invoice) < n and procedimentos:
        idx = _count(Invoice) + 1
        proc = procedimentos[(idx - 1) % len(procedimentos)]
        Invoice.objects.get_or_create(
            procedimento=proc,
            defaults={
                "inquilino": proc.inquilino,
                "origem": Invoice.Origem.ENFERMAGEM,
                "paciente": proc.paciente,
            },
        )

    # Sincroniza itens para todas as faturas em rascunho
    for fatura in Invoice.objects.order_by("id")[:n]:
        if fatura.estado == fatura.Estado.RASCUNHO:
            try:
                fatura.sincronizar_itens_da_origem()
            except Exception:
                # Se alguma origem nao estiver pronta (ex.: venda sem itens), segue adiante.
                continue

    return list(Invoice.objects.order_by("id"))


def ensure_invoice_history(n: int, faturas: list[Invoice]) -> None:
    while _count(InvoiceHistory) < n and faturas:
        idx = _count(InvoiceHistory) + 1
        fatura = faturas[(idx - 1) % len(faturas)]
        with tenant_ctx(fatura.inquilino):
            InvoiceHistory.objects.create(
                inquilino=fatura.inquilino,
                nome=f"Histórico {idx}",
                fatura=fatura,
                tipo_evento="SEED",
                descricao="Evento de histórico (seed)",
            )


def ensure_payments(n: int, faturas: list[Invoice]) -> list[Payment]:
    metodo = _safe_choice_value(Payment, "metodo")

    while _count(Payment) < n and faturas:
        idx = _count(Payment) + 1
        fatura = faturas[(idx - 1) % len(faturas)]
        valor = fatura.total if fatura.total and fatura.total > 0 else Decimal("100.00")
        with tenant_ctx(fatura.inquilino):
            pagamento = Payment.objects.create(
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
                    pagamento.confirm()

    return list(Payment.objects.order_by("id")[:n])


def ensure_payment_history(n: int, pagamentos: list[Payment]) -> None:
    while _count(PaymentHistory) < n and pagamentos:
        idx = _count(PaymentHistory) + 1
        pagamento = pagamentos[(idx - 1) % len(pagamentos)]
        with tenant_ctx(pagamento.inquilino):
            PaymentHistory.objects.create(
                inquilino=pagamento.inquilino,
                nome=f"Hist Pag {idx}",
                pagamento=pagamento,
                tipo_evento=PaymentHistory.EventType.CRIADO,
                valor=pagamento.valor,
                descricao="Pagamento criado (seed)",
                referencia_externa=pagamento.referencia_externa,
            )


def ensure_transactions(n: int) -> list[Transaction]:
    while _count(Transaction) < n:
        idx = _count(Transaction) + 1
        Transaction.objects.create(
            referencia_externa=f"TX-SEED-{idx:06d}",
            gateway="SEED_GATEWAY",
            status="confirmada" if idx % 2 == 0 else "pendente",
            resposta_gateway={"seed": idx},
        )
    return list(Transaction.objects.order_by("id")[:n])


def ensure_reconciliacoes(n: int, transacoes: list[Transaction]) -> list[Reconciliation]:
    while _count(Reconciliation) < n and transacoes:
        idx = _count(Reconciliation) + 1
        tx = transacoes[(idx - 1) % len(transacoes)]
        Reconciliation.objects.get_or_create(
            transacao=tx,
            defaults={
                "confirmado": idx % 2 == 0,
                "data_confirmacao": timezone.now() if idx % 2 == 0 else None,
            },
        )
    return list(Reconciliation.objects.order_by("id")[:n])


def ensure_recibos(n: int, pagamentos: list[Payment]) -> list[Receipt]:
    while _count(Receipt) < n and pagamentos:
        idx = _count(Receipt) + 1
        pag = next((p for p in pagamentos if not Receipt.objects.filter(pagamento=p).exists()), None)
        if pag is None:
            break
        Receipt.objects.create(
            fatura=pag.fatura,
            pagamento=pag,
            numero=f"RCB-SEED-{idx:06d}",
            valor=pag.valor,
        )
    return list(Receipt.objects.order_by("id")[:n])


def ensure_contabilidade(n: int, tenants: list[Tenant], faturas: list[Invoice]) -> None:
    tipo_conta = _safe_choice_value(Account, "tipo")

    # Para conseguir gerar Movimentos/LedgerLines, precisamos de pelo menos 2 contas por tenant.
    for tenant in tenants:
        with tenant_ctx(tenant):
            while Account.objects.filter(inquilino=tenant).count() < 2:
                idx = _count(Account) + 1
                Account.objects.create(
                    inquilino=tenant,
                    nome=f"Conta {idx}",
                    tipo=tipo_conta,
                )
    # E garante no mínimo `n` no total (caso `n` seja maior que 2 * tenants).
    while _count(Account) < n:
        idx = _count(Account) + 1
        tenant = tenants[(idx - 1) % len(tenants)]
        with tenant_ctx(tenant):
            Account.objects.create(
                inquilino=tenant,
                nome=f"Conta {idx}",
                tipo=tipo_conta,
            )

    # Precisamos do conjunto completo para garantir 2 contas por tenant na criação de movimentos/linhas.
    contas = list(Account.objects.order_by("inquilino_id", "id"))

    while _count(LegacyEntry) < n:
        idx = _count(LegacyEntry) + 1
        tenant = tenants[(idx - 1) % len(tenants)]
        with tenant_ctx(tenant):
            LegacyEntry.objects.create(
                inquilino=tenant,
                nome=f"Lançamento {idx}",
                descricao="Lançamento seed",
                referencia_externa=f"LANC-SEED-{idx:06d}",
            )

    lancamentos = list(LegacyEntry.objects.order_by("id")[:n])

    for idx, lanc in enumerate(lancamentos, start=1):
        contas_tenant = [c for c in contas if c.inquilino_id == lanc.inquilino_id]
        if len(contas_tenant) < 2:
            continue
        debito = contas_tenant[0]
        credito = contas_tenant[-1]

        with tenant_ctx(lanc.inquilino):
            if not LegacyMovement.objects.filter(lancamento=lanc, debito__gt=0).exists():
                LegacyMovement.objects.create(
                    inquilino=lanc.inquilino,
                    nome=f"Mov D {idx}",
                    lancamento=lanc,
                    conta=debito,
                    debito=Decimal("100.00"),
                    credito=Decimal("0.00"),
                )
            if not LegacyMovement.objects.filter(lancamento=lanc, credito__gt=0).exists():
                LegacyMovement.objects.create(
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
        AccountBalance.objects.get_or_create(conta=conta)

    # Conciliações financeiras (contabilidade) vinculadas a faturas.
    while _count(FinancialReconciliation) < n and faturas:
        idx = _count(FinancialReconciliation) + 1
        fatura = faturas[(idx - 1) % len(faturas)]
        with tenant_ctx(fatura.inquilino):
            FinancialReconciliation.objects.create(
                inquilino=fatura.inquilino,
                nome=f"Conciliação {idx}",
                fatura=fatura,
                valor_contabil=fatura.total or Decimal("100.00"),
                valor_recebido=fatura.total or Decimal("100.00"),
                referencia_externa=f"CON-SEED-{idx:06d}",
            )


def ensure_insurer(n: int, tenants: list[Tenant]) -> None:
    while _count(Insurer) < n:
        idx = _count(Insurer) + 1
        tenant = tenants[(idx - 1) % len(tenants)]
        with tenant_ctx(tenant):
            Insurer.objects.create(
                inquilino=tenant,
                nome=f"Seguradora {idx}",
                descricao="Seguradora seed",
                ordem=idx,
                codigo_externo=f"SEG-{idx:06d}",
                email=f"seg{idx:04d}@example.com",
                telefone=_moz_phone(2000 + idx),
                ativa=True,
            )

    seguradoras = list(Insurer.objects.order_by("id")[: max(n, 1)])

    while _count(CoveragePlan) < n:
        idx = _count(CoveragePlan) + 1
        seg = seguradoras[(idx - 1) % len(seguradoras)]
        with tenant_ctx(seg.inquilino):
            CoveragePlan.objects.create(
                inquilino=seg.inquilino,
                nome=f"Plano Cobertura {idx}",
                descricao="Plano seed",
                ordem=idx,
                seguradora=seg,
                percentual_cobertura=Decimal("80.00"),
                exige_autorizacao=idx % 2 == 0,
                ativo=True,
            )

    planos = list(CoveragePlan.objects.order_by("id")[: max(n, 1)])

    # Overrides por tenant
    while _count(TenantCoveragePlan) < n:
        idx = _count(TenantCoveragePlan) + 1
        tenant = tenants[(idx - 1) % len(tenants)]
        plano_global = planos[(idx - 1) % len(planos)]
        with tenant_ctx(tenant):
            TenantCoveragePlan.objects.get_or_create(
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
    requisicoes = list(LabRequest.objects.order_by("id")[: max(n, 1)])
    while _count(ProcedureAuthorization) < n and planos and requisicoes:
        idx = _count(ProcedureAuthorization) + 1
        plano = planos[(idx - 1) % len(planos)]
        req = requisicoes[(idx - 1) % len(requisicoes)]
        with tenant_ctx(plano.inquilino):
            ProcedureAuthorization.objects.create(
                inquilino=plano.inquilino,
                nome=f"Autorização {idx}",
                descricao="Autorização seed",
                ordem=idx,
                requisicao_id=req.id_custom or str(req.id),
                plano=plano,
                status=ProcedureAuthorization.Status.PENDENTE,
                codigo_autorizacao=f"AUT-{idx:06d}",
            )


def ensure_notifications(n: int, pacientes: list[Patient], faker: Faker) -> None:
    while NotificationTemplate.objects.count() < n:
        idx = NotificationTemplate.objects.count() + 1
        NotificationTemplate.objects.create(
            nome=f"Template {idx}",
            conteudo=faker.text(max_nb_chars=200),
        )

    templates = list(NotificationTemplate.objects.order_by("id")[:n])

    while Notification.objects.count() < n:
        idx = Notification.objects.count() + 1
        paciente = pacientes[(idx - 1) % len(pacientes)] if pacientes else None
        tpl = templates[(idx - 1) % len(templates)] if templates else None
        msg = faker.sentence(nb_words=12)
        if tpl:
            msg = f"[{tpl.nome}] {msg}"
        Notification.objects.create(
            paciente=paciente,
            destinatario=f"destinatario{idx:04d}@example.com",
            canal=Notification.Channel.EMAIL,
            assunto=f"Notificação {idx}",
            tipo_evento=Notification.EventType.GENERICA,
            referencia_externa=f"NTF-SEED-{idx:06d}",
            mensagem=msg,
            enviada=idx % 2 == 0,
            enviado_em=timezone.now() if idx % 2 == 0 else None,
        )

    notifs = list(Notification.objects.order_by("id")[:n])
    while DeliveryLog.objects.count() < n and notifs:
        idx = DeliveryLog.objects.count() + 1
        notif = notifs[(idx - 1) % len(notifs)]
        DeliveryLog.objects.create(
            notificacao=notif,
            status="enviado" if notif.enviada else "pendente",
            resposta=f"Resposta seed {idx}",
        )


def ensure_checkins(
    n: int,
    pacientes: list[Patient],
    users: list[User],
    requisicoes: list[LabRequest],
    faturas: list[Invoice],
    faker: Faker,
) -> None:
    while _count(ReceptionCheckin) < n and pacientes:
        idx = _count(ReceptionCheckin) + 1
        paciente = pacientes[(idx - 1) % len(pacientes)]
        atendente = users[(idx - 1) % len(users)] if users else None
        req = requisicoes[(idx - 1) % len(requisicoes)] if requisicoes else None
        fat = None
        if faturas and req is not None:
            fat = next((f for f in faturas if f.requisicao_id == req.id), None)
        with tenant_ctx(paciente.inquilino):
            ReceptionCheckin.objects.create(
                inquilino=paciente.inquilino,
                paciente=paciente,
                requisicao=req if idx % 2 == 0 else None,
                fatura=fat if idx % 3 == 0 else None,
                atendente=atendente,
                prioridade=random.choice([c[0] for c in ReceptionCheckin.Priority.choices]),
                estado=random.choice([c[0] for c in ReceptionCheckin.Status.choices]),
                motivo=faker.sentence(nb_words=8),
                observacoes=faker.sentence(nb_words=12),
            )


def report(minimo: int) -> None:
    faltando: list[str] = []
    app_configs = sorted(
        [cfg for cfg in apps.get_app_configs() if cfg.name.startswith("apps.")],
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

        tenants = ensure_tenants(n, faker)
        ensure_config_uso(tenants)
        planos = ensure_subscription_plans(n)
        ensure_assinaturas(n, tenants, planos)
        ensure_feature_flags(n, tenants)

        users = ensure_users(n, tenants, password, faker)
        ensure_professional_profiles(users, faker)
        ensure_password_reset_tokens(n, users)

        categorias = ensure_product_categories(n, tenants, faker)
        produtos = ensure_produtos(n, tenants, categorias, faker)
        lotes = ensure_lotes(n, produtos)
        vendas = ensure_vendas(n, tenants)
        ensure_itens_venda(n, vendas, produtos)
        ensure_inventory_movements(n, lotes)

        exames = ensure_exams(n, tenants, faker)
        campos = ensure_exam_fields(n, exames, faker)
        exames_med = ensure_medical_exams(n, tenants, faker)
        ensure_medical_exam_fields(n, exames_med, faker)
        pacientes = ensure_patients(n, tenants, faker)
        requisicoes = ensure_requests(n, pacientes, users)
        ensure_request_items(n, requisicoes, exames, exames_med)
        ensure_results(requisicoes, users)
        ensure_referencias(n, campos, faker)
        ensure_result_values(n)
        ensure_clinical_events(n, pacientes, requisicoes)
        ensure_clinical_history(n, pacientes, faker)

        registros = ensure_nursing_records(n, pacientes, faker)
        ensure_signals_vitais(n, registros)
        procedimentos = ensure_procedimentos(n, pacientes, users, faker)
        catalogos = ensure_catalogos_procedimento(n, tenants, faker)
        ensure_catalogo_materiais(n, catalogos, produtos, faker)
        ensure_procedimento_itens(n, procedimentos, catalogos)
        # ProcedimentoItem cria materiais automaticamente (e movimentos), garantindo ProcedimentoMaterial/valor.
        _ = list(ProcedureMaterial.objects.order_by("id")[:n])
        ensure_evolucoes(n, pacientes, faker)
        ensure_prescricoes(n, pacientes, faker)

        faturas = ensure_invoices(n, requisicoes, vendas, procedimentos)
        ensure_invoice_history(n, faturas)

        # Recepcao usa requisicoes/faturas
        ensure_checkins(n, pacientes, users, requisicoes, faturas, faker)

        pagamentos = ensure_payments(n, faturas)
        ensure_payment_history(n, pagamentos)
        transacoes = ensure_transactions(n)
        ensure_reconciliacoes(n, transacoes)
        ensure_recibos(n, pagamentos)

        ensure_contabilidade(n, tenants, faturas)
        ensure_insurer(n, tenants)
        ensure_notifications(n, pacientes, faker)

        report(n)

