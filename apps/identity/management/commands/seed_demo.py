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

from apps.accounting.models.account import Account
from apps.accounting.models.account_balance import AccountBalance
from apps.accounting.models.financial_reconciliation import FinancialReconciliation
from apps.accounting.models.ledger_entry import LedgerEntry
from apps.accounting.models.ledger_line import LedgerLine
from apps.accounting.models.legacy_entry import LegacyEntry
from apps.accounting.models.legacy_movement import LegacyMovement
from apps.billing.models.invoice import Invoice
from apps.billing.models.invoice_history import InvoiceHistory
from apps.clinical.models.clinical_event import ClinicalEvent
from apps.clinical.models.clinical_history import ClinicalHistory
from apps.clinical.models.clinical_reference import ClinicalReference
from apps.clinical.models.lab_exam import LabExam
from apps.clinical.models.lab_exam_field import LabExamField
from apps.clinical.models.lab_request import LabRequest
from apps.clinical.models.lab_request_item import LabRequestItem
from apps.clinical.models.medical_exam import MedicalExam, MedicalExamField
from apps.clinical.models.patient import Patient
from apps.clinical.models.result import Result
from apps.clinical.models.result_item import ResultItem
from apps.identity.models.password_reset_token import PasswordResetToken
from apps.identity.models.professional_profile import ProfessionalProfile
from apps.identity.models.user import User
from apps.insurer.models.coverage_plan import CoveragePlan
from apps.insurer.models.insurer import Insurer
from apps.insurer.models.procedure_authorization import ProcedureAuthorization
from apps.insurer.models.tenant_coverage_plan import TenantCoveragePlan
from apps.notifications.models.delivery_log import DeliveryLog
from apps.notifications.models.notification import Notification
from apps.notifications.models.notification_template import NotificationTemplate
from apps.nursing.models import (
    NursingEvolution,
    NursingPrescription,
    NursingRecord,
    NursingVitalSign,
    Procedure,
    ProcedureCatalog,
    ProcedureCatalogMaterial,
    ProcedureItem,
    ProcedureMaterial,
)
from apps.payments.models.payment import Payment
from apps.payments.models.payment_history import PaymentHistory
from apps.payments.models.receipt import Receipt
from apps.payments.models.reconciliation import Reconciliation
from apps.payments.models.transaction import Transaction
from apps.pharmacy.models.inventory_movement import InventoryMovement, MovementOrigin, MovementType
from apps.pharmacy.models.lot import Lot
from apps.pharmacy.models.product import Product
from apps.pharmacy.models.product_category import ProductCategory
from apps.pharmacy.models.sale import Sale
from apps.pharmacy.models.sale_item import SaleItem
from apps.reception.models.reception_checkin import ReceptionCheckin
from apps.tenants.models.configuration import TenantConfiguration
from apps.tenants.models.feature_flags import TenantFeatureFlag
from apps.tenants.models.subscription import TenantSubscription
from apps.tenants.models.subscription_plan import SubscriptionPlan
from apps.tenants.models.tenant import Tenant
from apps.tenants.models.tenant_usage import TenantUsage
from core.constants.clinical_event_type import ClinicalEventType
from infrastructure.context.tenant import reset_tenant, set_tenant


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
    tenant = Tenant.objects.filter(identifier="local").order_by("id").first()
    if tenant:
        return tenant
    return Tenant.objects.create(
        identifier="local",
        name="Tenant Local",
        domain="localhost",
        active=True,
        commercial_status=Tenant.CommercialStatus.TRIAL,
    )


def ensure_tenants(n: int, faker: Faker) -> list[Tenant]:
    tenants: list[Tenant] = []
    tenants.append(_ensure_local_tenant())

    while len(tenants) < n:
        idx = len(tenants) + 1
        identifier = f"seed-tenant-{idx:04d}"
        obj, created = Tenant.objects.get_or_create(
            identifier=identifier,
            defaults={
                "name": f"Clínica {faker.city()} {idx}",
                "domain": f"tenant{idx}.localhost",
                "active": True,
                "commercial_status": Tenant.CommercialStatus.TRIAL,
                "trial_until": timezone.localdate() + timedelta(days=30),
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
            tenant=tenant,
            defaults={
                "time_zone": "Africa/Maputo",
                "currency": "MZN",
                "language": "pt",
                "allows_multi_unit": idx % 2 == 0,
                "user_limit": 10 + idx,
            },
        )
        TenantUsage.objects.get_or_create(
            tenant=tenant,
            defaults={
                "active_users": 3 + idx,
                "current_month_requests": 20 * idx,
            },
        )


def ensure_subscription_plans(n: int) -> list[SubscriptionPlan]:
    plan_types = [choice[0] for choice in SubscriptionPlan.PlanType.choices]
    while _count(SubscriptionPlan) < n:
        idx = _count(SubscriptionPlan) + 1
        type = plan_types[(idx - 1) % len(plan_types)]
        SubscriptionPlan.objects.create(
            name=f"Plano {type} {idx}",
            description=f"Plano de assinatura seed ({type})",
            order=idx,
            type=type,
            user_limit=5 + idx,
            monthly_request_limit=1000 + 10 * idx,
            monthly_price=Decimal("0.00") if type == SubscriptionPlan.PlanType.FREE else Decimal("1990.00"),
            request_overage_price=Decimal("5.00"),
            priority_support=type == SubscriptionPlan.PlanType.PRO,
            allows_multi_unit=type != SubscriptionPlan.PlanType.FREE,
            active=True,
        )
    return list(SubscriptionPlan.objects.order_by("id")[:n])


def ensure_assinaturas(n: int, tenants: list[Tenant], planos: list[SubscriptionPlan]) -> None:
    # Garante pelo menos 1 assinatura por tenant (e no minimo n no total).
    for idx, tenant in enumerate(tenants, start=1):
        if not TenantSubscription.objects.filter(tenant=tenant).exists():
            plan = planos[(idx - 1) % len(planos)]
            TenantSubscription.objects.create(
                tenant=tenant,
                plan=plan,
                status=TenantSubscription.Status.ACTIVE,
                cycle=TenantSubscription.BillingCycle.MONTHLY,
                start_date=timezone.localdate() - timedelta(days=10 * idx),
            )

    while _count(TenantSubscription) < n:
        idx = _count(TenantSubscription) + 1
        tenant = tenants[(idx - 1) % len(tenants)]
        plan = planos[(idx - 1) % len(planos)]
        TenantSubscription.objects.create(
            tenant=tenant,
            plan=plan,
            status=TenantSubscription.Status.ACTIVE,
            cycle=TenantSubscription.BillingCycle.MONTHLY,
            start_date=timezone.localdate() - timedelta(days=idx),
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
        key = f"{chaves_base[(idx - 1) % len(chaves_base)]}_{idx:02d}"
        TenantFeatureFlag.objects.get_or_create(
            tenant=tenant,
            key=key,
            defaults={"active": idx % 3 != 0},
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
            name=f"{first_name} {last_name}",
            first_name=first_name,
            last_name=last_name,
            phone=_moz_phone(idx),
            is_active=True,
            tenant=tenant,
        )

    return list(User.objects.order_by("id")[:n])


def ensure_professional_profiles(users: list[User], faker: Faker) -> None:
    for idx, user in enumerate(users, start=1):
        ProfessionalProfile.objects.get_or_create(
            user=user,
            defaults={
                "role": random.choice(["Analista", "Enfermeiro", "Recepcionista", "Farmacêutico"]),
                "professional_registration": f"REG-{idx:06d}",
                "department": random.choice(["Laboratório", "Recepção", "Enfermagem", "Farmácia"]),
            },
        )


def ensure_password_reset_tokens(n: int, users: list[User]) -> None:
    while PasswordResetToken.objects.count() < n:
        idx = PasswordResetToken.objects.count() + 1
        user = users[(idx - 1) % len(users)]
        PasswordResetToken.objects.create(user=user)


def ensure_product_categories(n: int, tenants: list[Tenant], faker: Faker) -> list[ProductCategory]:
    # CategoriaProduto possui unique (tenant, name)
    while _count(ProductCategory) < n:
        idx = _count(ProductCategory) + 1
        tenant = tenants[(idx - 1) % len(tenants)]
        with tenant_ctx(tenant):
            name = f"Categoria {faker.word().title()} {idx}"
            ProductCategory.objects.get_or_create(
                tenant=tenant,
                name=name,
                defaults={"description": f"Categoria seed {idx}"},
            )

    return list(ProductCategory.objects.order_by("id")[:n])


def ensure_produtos(
    n: int, tenants: list[Tenant], categorias: list[ProductCategory], faker: Faker
) -> list[Product]:
    tipos = [c[0] for c in Product.ProductType.choices]

    while _count(Product) < n:
        idx = _count(Product) + 1
        tenant = tenants[(idx - 1) % len(tenants)]
        category = next((c for c in categorias if c.tenant_id == tenant.id), None)
        with tenant_ctx(tenant):
            Product.objects.create(
                tenant=tenant,
                name=f"{faker.word().title()} {faker.word().title()} {idx}",
                category=category,
                type=tipos[(idx - 1) % len(tipos)],
                sale_price=Decimal("25.00") + Decimal(idx),
            )

    return list(Product.objects.order_by("id")[:n])


def ensure_lotes(n: int, produtos: list[Product]) -> list[Lot]:
    while _count(Lot) < n:
        idx = _count(Lot) + 1
        product = produtos[(idx - 1) % len(produtos)]
        lot_number = f"SEED-{product.id or 0}-{idx:04d}"
        with tenant_ctx(product.tenant):
            if Lot.objects.filter(product=product, lot_number=lot_number).exists():
                continue
            Lot.objects.create(
                tenant=product.tenant,
                product=product,
                lot_number=lot_number,
                expiration_date=timezone.localdate() + timedelta(days=365 + idx),
                initial_quantity=1000,
            )
    return list(Lot.objects.order_by("id")[:n])


def ensure_vendas(n: int, tenants: list[Tenant]) -> list[Sale]:
    while _count(Sale) < n:
        idx = _count(Sale) + 1
        tenant = tenants[(idx - 1) % len(tenants)]
        with tenant_ctx(tenant):
            number = f"VEND-SEED-{tenant.id}-{idx:06d}"
            if Sale.objects.filter(tenant=tenant, number=number).exists():
                continue
            Sale.objects.create(
                tenant=tenant,
                number=number,
            )
    return list(Sale.objects.order_by("id")[:n])


def ensure_itens_sale(n: int, vendas: list[Sale], produtos: list[Product]) -> list[SaleItem]:
    # Cria itens garantindo estoque (ItemVenda baixa do lot automaticamente).
    while _count(SaleItem) < n:
        idx = _count(SaleItem) + 1
        sale = vendas[(idx - 1) % len(vendas)]

        produtos_tenant = [p for p in produtos if p.tenant_id == sale.tenant_id]
        if not produtos_tenant:
            break

        # Escolhe um product que não esteja na sale.
        product = next(
            (
                p
                for p in produtos_tenant
                if not SaleItem.objects.filter(sale=sale, product=p, deleted=False).exists()
            ),
            None,
        )
        if product is None:
            continue

        with tenant_ctx(sale.tenant):
            SaleItem.objects.create(
                tenant=sale.tenant,
                sale=sale,
                product=product,
                quantity=1,
            )
    return list(SaleItem.objects.order_by("id")[:n])


def ensure_inventory_movements(n: int, lotes: list[Lot]) -> None:
    # MovimentoEstoque ja e criado por vendas/procedures. Este passo so completa se faltar.
    while _count(InventoryMovement) < n and lotes:
        idx = _count(InventoryMovement) + 1
        lot = lotes[(idx - 1) % len(lotes)]
        with tenant_ctx(lot.tenant):
            InventoryMovement.objects.create(
                tenant=lot.tenant,
                lot=lot,
                type=MovementType.ENTRADA,
                origin=MovementOrigin.AJUSTE,
                quantity=5,
            )


def ensure_exams(n: int, tenants: list[Tenant], faker: Faker) -> list[LabExam]:
    method = _safe_choice_value(LabExam, "method")
    sector = _safe_choice_value(LabExam, "sector")

    while _count(LabExam) < n:
        idx = _count(LabExam) + 1
        tenant = tenants[(idx - 1) % len(tenants)]
        with tenant_ctx(tenant):
            LabExam.objects.create(
                tenant=tenant,
                name=f"{faker.word().title()} {faker.word().title()} ({idx})",
                turnaround_hours=24 + (idx % 24),
                price=Decimal("150.00") + Decimal(idx),
                method=method,
                sector=sector,
            )
    return list(LabExam.objects.order_by("id")[:n])


def ensure_exam_fields(n: int, exams: list[LabExam], faker: Faker) -> list[LabExamField]:
    type = _safe_choice_value(LabExamField, "type")
    unit = _safe_choice_value(LabExamField, "unit")

    while _count(LabExamField) < n:
        idx = _count(LabExamField) + 1
        exam = exams[(idx - 1) % len(exams)]
        with tenant_ctx(exam.tenant):
            LabExamField.objects.create(
                tenant=exam.tenant,
                exam=exam,
                name=f"{faker.word().title()} {idx}",
                type=type,
                unit=unit,
                reference_min=Decimal("4.00"),
                reference_max=Decimal("10.00"),
                critical_min=Decimal("2.00"),
                critical_max=Decimal("20.00"),
                max_delta=Decimal("10.00"),
            )
    return list(LabExamField.objects.order_by("id")[:n])


def ensure_medical_exams(n: int, tenants: list[Tenant], faker: Faker) -> list[MedicalExam]:
    method = _safe_choice_value(MedicalExam, "method")
    sector = _safe_choice_value(MedicalExam, "sector")

    while _count(MedicalExam) < n:
        idx = _count(MedicalExam) + 1
        tenant = tenants[(idx - 1) % len(tenants)]
        with tenant_ctx(tenant):
            MedicalExam.objects.create(
                tenant=tenant,
                name=f"Exame Imagem {faker.word().title()} {idx}",
                turnaround_hours=24 + (idx % 24),
                price=Decimal("500.00") + Decimal(5 * idx),
                method=method,
                sector=sector,
            )
    return list(MedicalExam.objects.order_by("id")[:n])


def ensure_medical_exam_fields(n: int, exams: list[MedicalExam], faker: Faker) -> list[MedicalExamField]:
    while _count(MedicalExamField) < n:
        idx = _count(MedicalExamField) + 1
        exam = exams[(idx - 1) % len(exams)]
        tipos_permitidos = list(exam.tipos_result_permitidos)
        type = random.choice(tipos_permitidos) if tipos_permitidos else _safe_choice_value(MedicalExamField, "type")
        with tenant_ctx(exam.tenant):
            MedicalExamField.objects.create(
                tenant=exam.tenant,
                exam=exam,
                name=f"Parâmetro {faker.word().title()} {idx}",
                type=type,
            )
    return list(MedicalExamField.objects.order_by("id")[:n])


def ensure_patients(n: int, tenants: list[Tenant], faker: Faker) -> list[Patient]:
    gender = _safe_choice_value(Patient, "gender")
    raca = _safe_choice_value(Patient, "race_origin")
    document_type = _safe_choice_value(Patient, "document_type")
    provenance = _safe_choice_value(Patient, "provenance")

    while _count(Patient) < n:
        idx = _count(Patient) + 1
        tenant = tenants[(idx - 1) % len(tenants)]
        name = faker.name()
        email = f"patient{idx:04d}@example.com"
        document_number = f"SEED-BI-{idx:06d}"
        with tenant_ctx(tenant):
            Patient.objects.create(
                tenant=tenant,
                name=name,
                address_street=faker.street_name(),
                address_number=str(faker.building_number()),
                address_neighborhood=faker.city_suffix(),
                address_city=faker.city(),
                # `pt_PT` não expõe `state()`. Usamos uma lista simples para ficar realista (MZ).
                address_province=random.choice(
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
                address_country="MZ",
                gender=gender,
                race_origin=raca,
                document_type=document_type,
                document_number=document_number,
                contact=_moz_phone(1000 + idx),
                email=email,
                provenance=provenance,
                birth_date=date(1990, 1, 1) + timedelta(days=30 * idx),
            )
    return list(Patient.objects.order_by("id")[:n])


def ensure_requests(n: int, pacientes: list[Patient], users: list[User]) -> list[LabRequest]:
    while _count(LabRequest) < n:
        idx = _count(LabRequest) + 1
        patient = pacientes[(idx - 1) % len(pacientes)]
        analyst = users[(idx - 1) % len(users)]
        with tenant_ctx(patient.tenant):
            LabRequest.objects.create(
                patient=patient,
                analyst=analyst,
            )
    return list(LabRequest.objects.order_by("id")[:n])


def ensure_request_items(
    n: int, requisicoes: list[LabRequest], exams: list[LabExam], exams_medicos: list[MedicalExam]
) -> None:
    # Garante pelo menos 1 exam laboratorial por requisição (gera `ResultadoItem` e itens de invoice).
    for req in requisicoes:
        if LabRequestItem.objects.filter(request=req, exam__isnull=False, deleted=False).exists():
            continue
        exam = next((e for e in exams if e.tenant_id == req.tenant_id), None)
        if exam is None:
            continue
        with tenant_ctx(req.tenant):
            if not LabRequestItem.objects.filter(request=req, exam=exam).exists():
                LabRequestItem.objects.create(request=req, exam=exam)

    # Completa o total de itens (opcionalmente incluindo exams médicos) até atingir `n`.
    while _count(LabRequestItem) < n and requisicoes:
        idx = _count(LabRequestItem) + 1
        req = requisicoes[(idx - 1) % len(requisicoes)]
        with tenant_ctx(req.tenant):
            # Alterna para incluir alguns exams médicos sem quebrar result/faturamento.
            if idx % 3 == 0 and exams_medicos:
                exam_med = next((e for e in exams_medicos if e.tenant_id == req.tenant_id), None)
                if exam_med is None:
                    continue
                if LabRequestItem.objects.filter(request=req, medical_exam=exam_med).exists():
                    continue
                LabRequestItem.objects.create(request=req, medical_exam=exam_med)
                continue

            exam = next((e for e in exams if e.tenant_id == req.tenant_id), None)
            if exam is None:
                continue
            if LabRequestItem.objects.filter(request=req, exam=exam).exists():
                continue
            LabRequestItem.objects.create(request=req, exam=exam)


def ensure_results(requisicoes: list[LabRequest], users: list[User]) -> list[Result]:
    for idx, req in enumerate(requisicoes, start=1):
        Result.objects.get_or_create(
            request=req,
            defaults={
                "tenant": req.tenant,
                "analyst": users[(idx - 1) % len(users)],
            },
        )
    return list(Result.objects.order_by("id"))


def ensure_referencias(n: int, campos: list[LabExamField], faker: Faker) -> list[ClinicalReference]:
    while _count(ClinicalReference) < n and campos:
        idx = _count(ClinicalReference) + 1
        campo = campos[(idx - 1) % len(campos)]
        with tenant_ctx(campo.tenant):
            ClinicalReference.objects.create(
                tenant=campo.tenant,
                name=f"Referência {faker.word().title()} {idx}",
                exam_field=campo,
                minimum_age_days=0,
                maximum_age_days=36500,
                minimum_value=Decimal("4.00"),
                maximum_value=Decimal("10.00"),
                critical_low=Decimal("2.00"),
                critical_high=Decimal("20.00"),
            )
    return list(ClinicalReference.objects.order_by("id")[:n])


def ensure_result_values(n: int) -> None:
    # Preenche alguns valores para ficar mais "real" (sem forcar validacao).
    itens = list(ResultItem.objects.filter(result_value__isnull=True).order_by("id")[:n])
    for idx, item in enumerate(itens, start=1):
        with tenant_ctx(item.tenant):
            item.result_value = Decimal("6.00") + Decimal(idx % 3)
            item.save(update_fields=["result_value"])


def ensure_clinical_events(n: int, pacientes: list[Patient], requisicoes: list[LabRequest]) -> None:
    while _count(ClinicalEvent) < n and pacientes and requisicoes:
        idx = _count(ClinicalEvent) + 1
        req = requisicoes[(idx - 1) % len(requisicoes)]
        patient = req.patient
        with tenant_ctx(req.tenant):
            ClinicalEvent.objects.create(
                tenant=req.tenant,
                patient=patient,
                request=req,
                event_type=ClinicalEventType.REQUISICAO_CRIADA,
                description=f"Evento clínico seed para {patient.name}.",
                name=f"Evento {idx}",
            )


def ensure_clinical_history(n: int, pacientes: list[Patient], faker: Faker) -> None:
    while ClinicalHistory.objects.count() < n and pacientes:
        idx = ClinicalHistory.objects.count() + 1
        patient = pacientes[(idx - 1) % len(pacientes)]
        ClinicalHistory.objects.create(
            patient=patient,
            description=f"Histórico clínico: {faker.sentence(nb_words=10)}",
        )


def ensure_nursing_records(n: int, pacientes: list[Patient], faker: Faker) -> list[NursingRecord]:
    priority = _safe_choice_value(NursingRecord, "priority")
    while _count(NursingRecord) < n and pacientes:
        idx = _count(NursingRecord) + 1
        patient = pacientes[(idx - 1) % len(pacientes)]
        with tenant_ctx(patient.tenant):
            NursingRecord.objects.create(
                tenant=patient.tenant,
                name=f"Registro Enfermagem {idx}",
                patient=patient,
                priority=priority,
                observation=faker.sentence(nb_words=12),
            )
    return list(NursingRecord.objects.order_by("id")[:n])


def ensure_signals_vitais(n: int, registros: list[NursingRecord]) -> list[NursingVitalSign]:
    while _count(NursingVitalSign) < n and registros:
        idx = _count(NursingVitalSign) + 1
        record = registros[(idx - 1) % len(registros)]
        with tenant_ctx(record.tenant):
            NursingVitalSign.objects.create(
                tenant=record.tenant,
                name=f"Sinais Vitais {idx}",
                record=record,
                temperature_c=Decimal("36.5"),
                heart_rate=70 + (idx % 20),
                respiratory_rate=18 + (idx % 4),
                oxygen_saturation=97,
                blood_pressure="120/80",
            )
    return list(NursingVitalSign.objects.order_by("id")[:n])


def ensure_procedures(n: int, pacientes: list[Patient], users: list[User], faker: Faker) -> list[Procedure]:
    while _count(Procedure) < n and pacientes:
        idx = _count(Procedure) + 1
        patient = pacientes[(idx - 1) % len(pacientes)]
        professional = users[(idx - 1) % len(users)] if users else None
        with tenant_ctx(patient.tenant):
            Procedure.objects.create(
                tenant=patient.tenant,
                patient=patient,
                professional=professional,
                notes=faker.sentence(nb_words=12),
            )
    return list(Procedure.objects.order_by("id")[:n])


def ensure_catalogos_procedure(n: int, tenants: list[Tenant], faker: Faker) -> list[ProcedureCatalog]:
    while _count(ProcedureCatalog) < n:
        idx = _count(ProcedureCatalog) + 1
        tenant = tenants[(idx - 1) % len(tenants)]
        with tenant_ctx(tenant):
            ProcedureCatalog.objects.create(
                tenant=tenant,
                name=f"Procedimento {faker.word().title()} {idx}",
                description=f"Descrição seed {idx}",
                default_price=Decimal("350.00") + Decimal(idx),
            )
    return list(ProcedureCatalog.objects.order_by("id")[:n])


def ensure_catalog_materiais(
    n: int, catalogos: list[ProcedureCatalog], produtos: list[Product], faker: Faker
) -> None:
    # Gera 1 material padrao por catalog ate atingir n.
    while _count(ProcedureCatalogMaterial) < n and catalogos and produtos:
        idx = _count(ProcedureCatalogMaterial) + 1
        catalog = catalogos[(idx - 1) % len(catalogos)]
        product = next((p for p in produtos if p.tenant_id == catalog.tenant_id), None)
        if product is None:
            continue
        with tenant_ctx(catalog.tenant):
            ProcedureCatalogMaterial.objects.get_or_create(
                catalog=catalog,
                product=product,
                defaults={
                    "tenant": catalog.tenant,
                    "default_quantity": Decimal("1.00"),
                    "default_unit_cost": product.sale_price,
                    "observation": f"Material padrão seed {idx}",
                },
            )


def ensure_procedure_itens(
    n: int, procedures: list[Procedure], catalogos: list[ProcedureCatalog]
) -> list[ProcedureItem]:
    # Usa catalog para gerar materiais automaticamente.
    while _count(ProcedureItem) < n and procedures:
        idx = _count(ProcedureItem) + 1
        proc = procedures[(idx - 1) % len(procedures)]
        catalog = next((c for c in catalogos if c.tenant_id == proc.tenant_id), None)
        with tenant_ctx(proc.tenant):
            ProcedureItem.objects.create(
                tenant=proc.tenant,
                procedure=proc,
                catalog=catalog,
                description="" if catalog else f"Serviço seed {idx}",
                quantity=1,
                unit_price=Decimal("0.00"),
                performed=True,
                observation="",
            )
    return list(ProcedureItem.objects.order_by("id")[:n])


def ensure_evolucoes(n: int, pacientes: list[Patient], faker: Faker) -> None:
    while _count(NursingEvolution) < n and pacientes:
        idx = _count(NursingEvolution) + 1
        patient = pacientes[(idx - 1) % len(pacientes)]
        with tenant_ctx(patient.tenant):
            NursingEvolution.objects.create(
                tenant=patient.tenant,
                patient=patient,
                name=f"Evolução {idx}",
                observation=faker.paragraph(nb_sentences=3),
            )


def ensure_prescricoes(n: int, pacientes: list[Patient], faker: Faker) -> None:
    while _count(NursingPrescription) < n and pacientes:
        idx = _count(NursingPrescription) + 1
        patient = pacientes[(idx - 1) % len(pacientes)]
        with tenant_ctx(patient.tenant):
            NursingPrescription.objects.create(
                tenant=patient.tenant,
                patient=patient,
                name=f"Prescrição {idx}",
                description=faker.sentence(nb_words=12),
                active=idx % 5 != 0,
            )


def ensure_invoices(
    n: int, requisicoes: list[LabRequest], vendas: list[Sale], procedures: list[Procedure]
) -> list[Invoice]:
    # Cria faturas clinico primeiro
    for req in requisicoes:
        Invoice.objects.get_or_create(
            request=req,
            defaults={
                "tenant": req.tenant,
                "origin": Invoice.Origin.CLINICAL,
                "patient": req.patient,
            },
        )

    # Cria faturas de farmacia e enfermagem se faltar para atingir n
    while _count(Invoice) < n and vendas:
        idx = _count(Invoice) + 1
        sale = vendas[(idx - 1) % len(vendas)]
        Invoice.objects.get_or_create(
            sale=sale,
            defaults={
                "tenant": sale.tenant,
                "origin": Invoice.Origin.PHARMACY,
            },
        )

    while _count(Invoice) < n and procedures:
        idx = _count(Invoice) + 1
        proc = procedures[(idx - 1) % len(procedures)]
        Invoice.objects.get_or_create(
            procedure=proc,
            defaults={
                "tenant": proc.tenant,
                "origin": Invoice.Origin.NURSING,
                "patient": proc.patient,
            },
        )

    # Sincroniza itens para todas as faturas em rascunho
    for invoice in Invoice.objects.order_by("id")[:n]:
        if invoice.status == invoice.Status.DRAFT:
            try:
                invoice.sync_items_from_origin()
            except Exception:
                # Se alguma origin nao estiver pronta (ex.: sale sem itens), segue adiante.
                continue

    return list(Invoice.objects.order_by("id"))


def ensure_invoice_history(n: int, faturas: list[Invoice]) -> None:
    while _count(InvoiceHistory) < n and faturas:
        idx = _count(InvoiceHistory) + 1
        invoice = faturas[(idx - 1) % len(faturas)]
        with tenant_ctx(invoice.tenant):
            InvoiceHistory.objects.create(
                tenant=invoice.tenant,
                name=f"Histórico {idx}",
                invoice=invoice,
                event_type="SEED",
                description="Evento de histórico (seed)",
            )


def ensure_payments(n: int, faturas: list[Invoice]) -> list[Payment]:
    method = _safe_choice_value(Payment, "method")

    while _count(Payment) < n and faturas:
        idx = _count(Payment) + 1
        invoice = faturas[(idx - 1) % len(faturas)]
        value = invoice.total if invoice.total and invoice.total > 0 else Decimal("100.00")
        with tenant_ctx(invoice.tenant):
            payment = Payment.objects.create(
                tenant=invoice.tenant,
                name=f"Pagamento {idx}",
                invoice=invoice,
                value=value,
                method=method,
                external_reference=f"PG-SEED-{idx:06d}",
            )
            # Emite e confirma alguns pagamentos para gerar recibos automaticamente.
            if idx % 2 == 0 and invoice.status == invoice.Status.DRAFT:
                with suppress(Exception):
                    invoice.issue()
            if idx % 3 == 0 and payment.status == payment.Status.PENDENTE:
                with suppress(Exception):
                    payment.confirm()

    return list(Payment.objects.order_by("id")[:n])


def ensure_payment_history(n: int, pagamentos: list[Payment]) -> None:
    while _count(PaymentHistory) < n and pagamentos:
        idx = _count(PaymentHistory) + 1
        payment = pagamentos[(idx - 1) % len(pagamentos)]
        with tenant_ctx(payment.tenant):
            PaymentHistory.objects.create(
                tenant=payment.tenant,
                name=f"Hist Pag {idx}",
                payment=payment,
                event_type=PaymentHistory.EventType.CRIADO,
                value=payment.value,
                description="Pagamento criado (seed)",
                external_reference=payment.external_reference,
            )


def ensure_transactions(n: int) -> list[Transaction]:
    while _count(Transaction) < n:
        idx = _count(Transaction) + 1
        Transaction.objects.create(
            external_reference=f"TX-SEED-{idx:06d}",
            gateway="SEED_GATEWAY",
            status="confirmada" if idx % 2 == 0 else "pendente",
            gateway_response={"seed": idx},
        )
    return list(Transaction.objects.order_by("id")[:n])


def ensure_reconciliacoes(n: int, transacoes: list[Transaction]) -> list[Reconciliation]:
    while _count(Reconciliation) < n and transacoes:
        idx = _count(Reconciliation) + 1
        tx = transacoes[(idx - 1) % len(transacoes)]
        Reconciliation.objects.get_or_create(
            transaction=tx,
            defaults={
                "confirmed": idx % 2 == 0,
                "confirmation_date": timezone.now() if idx % 2 == 0 else None,
            },
        )
    return list(Reconciliation.objects.order_by("id")[:n])


def ensure_recibos(n: int, pagamentos: list[Payment]) -> list[Receipt]:
    while _count(Receipt) < n and pagamentos:
        idx = _count(Receipt) + 1
        pag = next((p for p in pagamentos if not Receipt.objects.filter(payment=p).exists()), None)
        if pag is None:
            break
        Receipt.objects.create(
            invoice=pag.invoice,
            payment=pag,
            number=f"RCB-SEED-{idx:06d}",
            value=pag.value,
        )
    return list(Receipt.objects.order_by("id")[:n])


def ensure_contabilidade(n: int, tenants: list[Tenant], faturas: list[Invoice]) -> None:
    type_account = _safe_choice_value(Account, "type")

    # Para conseguir gerar Movimentos/LedgerLines, precisamos de pelo menos 2 contas por tenant.
    for tenant in tenants:
        with tenant_ctx(tenant):
            while Account.objects.filter(tenant=tenant).count() < 2:
                idx = _count(Account) + 1
                Account.objects.create(
                    tenant=tenant,
                    name=f"Conta {idx}",
                    type=type_account,
                )
    # E garante no mínimo `n` no total (caso `n` seja maior que 2 * tenants).
    while _count(Account) < n:
        idx = _count(Account) + 1
        tenant = tenants[(idx - 1) % len(tenants)]
        with tenant_ctx(tenant):
            Account.objects.create(
                tenant=tenant,
                name=f"Conta {idx}",
                type=type_account,
            )

    # Precisamos do conjunto completo para garantir 2 contas por tenant na criação de movimentos/linhas.
    contas = list(Account.objects.order_by("tenant_id", "id"))

    while _count(LegacyEntry) < n:
        idx = _count(LegacyEntry) + 1
        tenant = tenants[(idx - 1) % len(tenants)]
        with tenant_ctx(tenant):
            LegacyEntry.objects.create(
                tenant=tenant,
                name=f"Lançamento {idx}",
                description="Lançamento seed",
                external_reference=f"LANC-SEED-{idx:06d}",
            )

    lancamentos = list(LegacyEntry.objects.order_by("id")[:n])

    for idx, lanc in enumerate(lancamentos, start=1):
        contas_tenant = [c for c in contas if c.tenant_id == lanc.tenant_id]
        if len(contas_tenant) < 2:
            continue
        debit = contas_tenant[0]
        credit = contas_tenant[-1]

        with tenant_ctx(lanc.tenant):
            if not LegacyMovement.objects.filter(entry=lanc, debit__gt=0).exists():
                LegacyMovement.objects.create(
                    tenant=lanc.tenant,
                    name=f"Mov D {idx}",
                    entry=lanc,
                    account=debit,
                    debit=Decimal("100.00"),
                    credit=Decimal("0.00"),
                )
            if not LegacyMovement.objects.filter(entry=lanc, credit__gt=0).exists():
                LegacyMovement.objects.create(
                    tenant=lanc.tenant,
                    name=f"Mov C {idx}",
                    entry=lanc,
                    account=credit,
                    debit=Decimal("0.00"),
                    credit=Decimal("100.00"),
                )

    while _count(LedgerEntry) < n:
        idx = _count(LedgerEntry) + 1
        tenant = tenants[(idx - 1) % len(tenants)]
        with tenant_ctx(tenant):
            LedgerEntry.objects.create(
                tenant=tenant,
                name=f"Ledger Entry {idx}",
                external_reference=f"LED-REF-{idx:06d}",
                idempotency_key=f"LED-IDEMP-{idx:06d}",
                accounting_date=timezone.localdate(),
                description="Entry seed",
            )

    entries = list(LedgerEntry.objects.order_by("id")[:n])

    for idx, entry in enumerate(entries, start=1):
        contas_tenant = [c for c in contas if c.tenant_id == entry.tenant_id]
        if len(contas_tenant) < 2:
            continue
        debit = contas_tenant[0]
        credit = contas_tenant[-1]
        with tenant_ctx(entry.tenant):
            if not LedgerLine.objects.filter(entry=entry, nature="D").exists():
                LedgerLine.objects.create(
                    tenant=entry.tenant,
                    name=f"LL D {idx}",
                    entry=entry,
                    account=debit,
                    value=Decimal("50.00"),
                    nature="D",
                )
            if not LedgerLine.objects.filter(entry=entry, nature="C").exists():
                LedgerLine.objects.create(
                    tenant=entry.tenant,
                    name=f"LL C {idx}",
                    entry=entry,
                    account=credit,
                    value=Decimal("50.00"),
                    nature="C",
                )

    for account in contas:
        AccountBalance.objects.get_or_create(account=account)

    # Conciliações financeiras (contabilidade) vinculadas a faturas.
    while _count(FinancialReconciliation) < n and faturas:
        idx = _count(FinancialReconciliation) + 1
        invoice = faturas[(idx - 1) % len(faturas)]
        with tenant_ctx(invoice.tenant):
            FinancialReconciliation.objects.create(
                tenant=invoice.tenant,
                name=f"Conciliação {idx}",
                invoice=invoice,
                accounting_value=invoice.total or Decimal("100.00"),
                received_amount=invoice.total or Decimal("100.00"),
                external_reference=f"CON-SEED-{idx:06d}",
            )


def ensure_insurer(n: int, tenants: list[Tenant]) -> None:
    while _count(Insurer) < n:
        idx = _count(Insurer) + 1
        tenant = tenants[(idx - 1) % len(tenants)]
        with tenant_ctx(tenant):
            Insurer.objects.create(
                tenant=tenant,
                name=f"Seguradora {idx}",
                description="Seguradora seed",
                order=idx,
                external_code=f"SEG-{idx:06d}",
                email=f"seg{idx:04d}@example.com",
                phone=_moz_phone(2000 + idx),
                active=True,
            )

    seguradoras = list(Insurer.objects.order_by("id")[: max(n, 1)])

    while _count(CoveragePlan) < n:
        idx = _count(CoveragePlan) + 1
        seg = seguradoras[(idx - 1) % len(seguradoras)]
        with tenant_ctx(seg.tenant):
            CoveragePlan.objects.create(
                tenant=seg.tenant,
                name=f"Plano Cobertura {idx}",
                description="Plano seed",
                order=idx,
                insurer=seg,
                coverage_percentage=Decimal("80.00"),
                requires_authorization=idx % 2 == 0,
                active=True,
            )

    planos = list(CoveragePlan.objects.order_by("id")[: max(n, 1)])

    # Overrides por tenant
    while _count(TenantCoveragePlan) < n:
        idx = _count(TenantCoveragePlan) + 1
        tenant = tenants[(idx - 1) % len(tenants)]
        global_plan = planos[(idx - 1) % len(planos)]
        with tenant_ctx(tenant):
            TenantCoveragePlan.objects.get_or_create(
                tenant=tenant,
                global_plan=global_plan,
                defaults={
                    "name": f"Override {idx}",
                    "description": "Override seed",
                    "order": idx,
                    "override_percentage": Decimal("75.00") if idx % 2 == 0 else None,
                    "active": True,
                },
            )

    # Autorizações
    requisicoes = list(LabRequest.objects.order_by("id")[: max(n, 1)])
    while _count(ProcedureAuthorization) < n and planos and requisicoes:
        idx = _count(ProcedureAuthorization) + 1
        plan = planos[(idx - 1) % len(planos)]
        req = requisicoes[(idx - 1) % len(requisicoes)]
        with tenant_ctx(plan.tenant):
            ProcedureAuthorization.objects.create(
                tenant=plan.tenant,
                name=f"Autorização {idx}",
                description="Autorização seed",
                order=idx,
                request_id=req.custom_id or str(req.id),
                plan=plan,
                status=ProcedureAuthorization.Status.PENDENTE,
                authorization_code=f"AUT-{idx:06d}",
            )


def ensure_notifications(n: int, pacientes: list[Patient], faker: Faker) -> None:
    while NotificationTemplate.objects.count() < n:
        idx = NotificationTemplate.objects.count() + 1
        NotificationTemplate.objects.create(
            name=f"Template {idx}",
            content=faker.text(max_nb_chars=200),
        )

    templates = list(NotificationTemplate.objects.order_by("id")[:n])

    while Notification.objects.count() < n:
        idx = Notification.objects.count() + 1
        patient = pacientes[(idx - 1) % len(pacientes)] if pacientes else None
        tpl = templates[(idx - 1) % len(templates)] if templates else None
        msg = faker.sentence(nb_words=12)
        if tpl:
            msg = f"[{tpl.name}] {msg}"
        Notification.objects.create(
            patient=patient,
            recipient=f"recipient{idx:04d}@example.com",
            channel=Notification.Channel.EMAIL,
            subject=f"Notificação {idx}",
            event_type=Notification.EventType.GENERICA,
            external_reference=f"NTF-SEED-{idx:06d}",
            message=msg,
            sent=idx % 2 == 0,
            sent_at=timezone.now() if idx % 2 == 0 else None,
        )

    notifs = list(Notification.objects.order_by("id")[:n])
    while DeliveryLog.objects.count() < n and notifs:
        idx = DeliveryLog.objects.count() + 1
        notif = notifs[(idx - 1) % len(notifs)]
        DeliveryLog.objects.create(
            notification=notif,
            status="enviado" if notif.sent else "pendente",
            response=f"Resposta seed {idx}",
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
        patient = pacientes[(idx - 1) % len(pacientes)]
        attendant = users[(idx - 1) % len(users)] if users else None
        req = requisicoes[(idx - 1) % len(requisicoes)] if requisicoes else None
        fat = None
        if faturas and req is not None:
            fat = next((f for f in faturas if f.request_id == req.id), None)
        with tenant_ctx(patient.tenant):
            ReceptionCheckin.objects.create(
                tenant=patient.tenant,
                patient=patient,
                request=req if idx % 2 == 0 else None,
                invoice=fat if idx % 3 == 0 else None,
                attendant=attendant,
                priority=random.choice([c[0] for c in ReceptionCheckin.Priority.choices]),
                status=random.choice([c[0] for c in ReceptionCheckin.Status.choices]),
                reason=faker.sentence(nb_words=8),
                notes=faker.sentence(nb_words=12),
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
        parser.add_argument("--n", type=int, default=10, help="Mínimo de registros por model.")
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
        ensure_itens_sale(n, vendas, produtos)
        ensure_inventory_movements(n, lotes)

        exams = ensure_exams(n, tenants, faker)
        campos = ensure_exam_fields(n, exams, faker)
        exams_med = ensure_medical_exams(n, tenants, faker)
        ensure_medical_exam_fields(n, exams_med, faker)
        pacientes = ensure_patients(n, tenants, faker)
        requisicoes = ensure_requests(n, pacientes, users)
        ensure_request_items(n, requisicoes, exams, exams_med)
        ensure_results(requisicoes, users)
        ensure_referencias(n, campos, faker)
        ensure_result_values(n)
        ensure_clinical_events(n, pacientes, requisicoes)
        ensure_clinical_history(n, pacientes, faker)

        registros = ensure_nursing_records(n, pacientes, faker)
        ensure_signals_vitais(n, registros)
        procedures = ensure_procedures(n, pacientes, users, faker)
        catalogos = ensure_catalogos_procedure(n, tenants, faker)
        ensure_catalog_materiais(n, catalogos, produtos, faker)
        ensure_procedure_itens(n, procedures, catalogos)
        # ProcedimentoItem cria materiais automaticamente (e movimentos), garantindo ProcedimentoMaterial/value.
        _ = list(ProcedureMaterial.objects.order_by("id")[:n])
        ensure_evolucoes(n, pacientes, faker)
        ensure_prescricoes(n, pacientes, faker)

        faturas = ensure_invoices(n, requisicoes, vendas, procedures)
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
