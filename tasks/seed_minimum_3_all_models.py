from datetime import date, timedelta
from decimal import Decimal
from uuid import uuid4

from django.apps import apps
from django.utils import timezone

from apps.accounting.models.account import Account
from apps.accounting.models.account_balance import AccountBalance
from apps.accounting.models.financial_reconciliation import FinancialReconciliation
from apps.accounting.models.ledger_entry import LedgerEntry
from apps.accounting.models.ledger_line import LedgerLine
from apps.accounting.models.legacy_entry import LegacyEntry
from apps.accounting.models.legacy_movement import LegacyMovement
from apps.billing.models.invoice import Invoice
from apps.billing.models.invoice_history import InvoiceHistory
from apps.billing.models.invoice_items import InvoiceItem
from apps.clinical.models.clinical_reference import ClinicalReference
from apps.clinical.models.lab_exam import LabExam
from apps.clinical.models.lab_exam_field import LabExamField
from apps.clinical.models.lab_request import LabRequest
from apps.clinical.models.lab_request_item import LabRequestItem
from apps.clinical.models.patient import Patient
from apps.clinical.models.result import Result
from apps.clinical.models.result_item import ResultItem
from apps.identity.models.password_reset_token import PasswordResetToken
from apps.identity.models.professional_profile import ProfessionalProfile
from apps.identity.models.user import User
from apps.insurer.models.coverage_plan import CoveragePlan
from apps.insurer.models.insurer import Insurer
from apps.insurer.models.procedure_authorization import ProcedureAuthorization
from apps.notifications.models.delivery_log import DeliveryLog
from apps.notifications.models.notification import Notification
from apps.notifications.models.notification_template import NotificationTemplate
from apps.nursing.models import (
    NursingRecord,
    NursingVitalSign,
    Procedure,
    ProcedureCatalog,
    ProcedureCatalogMaterial,
    ProcedureItem,
    ProcedureItemValue,
    ProcedureMaterial,
    ProcedureMaterialValue,
)
from apps.payments.models.payment import Payment
from apps.payments.models.receipt import Receipt
from apps.payments.models.reconciliation import Reconciliation
from apps.payments.models.transaction import Transaction
from apps.pharmacy.models.inventory_movement import InventoryMovement, TipoMovimento
from apps.pharmacy.models.lot import Lot
from apps.pharmacy.models.product import Product
from apps.pharmacy.models.product_category import ProductCategory
from apps.pharmacy.models.sale import Sale
from apps.pharmacy.models.sale_item import SaleItem
from apps.tenants.models.configuration import TenantConfiguration
from apps.tenants.models.tenant import Tenant
from apps.tenants.models.tenant_usage import TenantUsage

MIN_REGISTROS = 3


def mgr(model):
    return getattr(model, "all_objects", model.objects)


def total(model):
    return mgr(model).count()


def choice_value(model, field_name):
    choices = list(model._meta.get_field(field_name).choices)
    return choices[0][0] if choices else None


def unique_str(model, field_name, prefix):
    i = 1
    while True:
        value = f"{prefix}{i}"
        if not mgr(model).filter(**{field_name: value}).exists():
            return value
        i += 1


def ensure_tenants():
    while total(Tenant) < MIN_REGISTROS:
        idx = total(Tenant) + 1
        identifier = unique_str(Tenant, "identifier", "seed-inq-")
        Tenant.objects.create(
            identifier=identifier,
            name=f"Inquilino Seed {idx}",
            active=True,
        )

    return list(Tenant.objects.order_by("id")[:MIN_REGISTROS])


def ensure_users():
    while User.objects.count() < MIN_REGISTROS:
        idx = User.objects.count() + 1
        email = f"seed.user{idx}@example.com"
        while User.objects.filter(email=email).exists():
            idx += 1
            email = f"seed.user{idx}@example.com"
        User.objects.create_user(
            email=email,
            password="Seed@123456",
            first_name=f"Seed{idx}",
            last_name="User",
            phone=f"840000{idx:03d}",
            is_active=True,
        )

    return list(User.objects.order_by("id")[:MIN_REGISTROS])


def ensure_config_uso(tenants):
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
                "active_users": 5 + idx,
                "current_month_requests": 10 * idx,
            },
        )


def ensure_clinical(tenants, users):
    method = choice_value(LabExam, "method")
    sector = choice_value(LabExam, "sector")
    type_result = choice_value(LabExamField, "type")
    unit = choice_value(LabExamField, "unit")
    gender = choice_value(Patient, "gender")
    raca = choice_value(Patient, "race_origin")
    document_type = choice_value(Patient, "document_type")
    provenance = choice_value(Patient, "provenance")

    while total(LabExam) < MIN_REGISTROS:
        idx = total(LabExam) + 1
        tenant = tenants[(idx - 1) % len(tenants)]
        LabExam.objects.create(
            tenant=tenant,
            name=f"Exame Seed {idx}",
            turnaround_hours=24 + idx,
            price=Decimal("50.00") + Decimal(idx),
            method=method,
            sector=sector,
        )

    exams = list(LabExam.objects.order_by("id"))

    while total(LabExamField) < MIN_REGISTROS:
        idx = total(LabExamField) + 1
        exam = exams[(idx - 1) % len(exams)]
        LabExamField.objects.create(
            tenant=exam.tenant,
            name=f"Campo Seed {idx}",
            exam=exam,
            type=type_result,
            unit=unit,
            reference_min=Decimal("4.00"),
            reference_max=Decimal("10.00"),
            critical_min=Decimal("2.00"),
            critical_max=Decimal("20.00"),
        )

    while total(Patient) < MIN_REGISTROS:
        idx = total(Patient) + 1
        tenant = tenants[(idx - 1) % len(tenants)]
        Patient.objects.create(
            tenant=tenant,
            name=f"Paciente Seed {idx}",
            address=f"Rua Seed {idx}",
            gender=gender,
            race_origin=raca,
            document_type=document_type,
            document_number=f"SEED-ID-{idx:04d}",
            contact=f"840100{idx:03d}",
            email=f"patient.seed{idx}@example.com",
            provenance=provenance,
            birth_date=date(1990, 1, 1) + timedelta(days=30 * idx),
        )

    pacientes = list(Patient.objects.order_by("id"))

    while total(LabRequest) < MIN_REGISTROS:
        idx = total(LabRequest) + 1
        patient = pacientes[(idx - 1) % len(pacientes)]
        analyst = users[(idx - 1) % len(users)]
        LabRequest.objects.create(
            tenant=patient.tenant,
            patient=patient,
            analyst=analyst,
        )

    requisicoes = list(LabRequest.objects.order_by("id")[:MIN_REGISTROS])
    exams_seed = list(LabExam.objects.order_by("id")[:MIN_REGISTROS])

    for idx, req in enumerate(requisicoes, start=1):
        exam = exams_seed[(idx - 1) % len(exams_seed)]
        LabRequestItem.objects.get_or_create(
            request=req,
            exam=exam,
            defaults={"tenant": req.tenant},
        )

    if total(LabRequestItem) < MIN_REGISTROS:
        for req in requisicoes:
            for exam in exams_seed:
                if total(LabRequestItem) >= MIN_REGISTROS:
                    break
                LabRequestItem.objects.get_or_create(
                    request=req,
                    exam=exam,
                    defaults={"tenant": req.tenant},
                )
            if total(LabRequestItem) >= MIN_REGISTROS:
                break

    for idx, req in enumerate(requisicoes, start=1):
        Result.objects.get_or_create(
            request=req,
            defaults={
                "tenant": req.tenant,
                "analyst": users[(idx - 1) % len(users)],
            },
        )

    resultados = list(Result.objects.order_by("id"))
    campos = list(LabExamField.objects.order_by("id"))

    for idx in range(max(len(resultados), len(campos))):
        if total(ResultItem) >= MIN_REGISTROS:
            break
        result = resultados[idx % len(resultados)]
        campo = campos[idx % len(campos)]
        ResultItem.objects.get_or_create(
            result=result,
            exam_field=campo,
            defaults={"tenant": result.tenant},
        )

    while total(ClinicalReference) < MIN_REGISTROS:
        idx = total(ClinicalReference) + 1
        campo = campos[(idx - 1) % len(campos)]
        ClinicalReference.objects.create(
            tenant=campo.tenant,
            name=f"Referência Seed {idx}",
            exam_field=campo,
            minimum_age_days=0,
            maximum_age_days=36500,
            minimum_value=Decimal("4.00"),
            maximum_value=Decimal("10.00"),
            critical_low=Decimal("2.00"),
            critical_high=Decimal("20.00"),
        )


def ensure_enfermagem(users):
    pacientes = list(Patient.objects.order_by("id")[:MIN_REGISTROS])
    produtos = list(Product.objects.order_by("id"))

    priority = choice_value(NursingRecord, "priority")

    while total(NursingRecord) < MIN_REGISTROS:
        idx = total(NursingRecord) + 1
        patient = pacientes[(idx - 1) % len(pacientes)]
        NursingRecord.objects.create(
            tenant=patient.tenant,
            name=f"Registro Enfermagem Seed {idx}",
            patient=patient,
            priority=priority,
            observation=f"Observação de enfermagem seed {idx}",
        )

    registros = list(NursingRecord.objects.order_by("id")[:MIN_REGISTROS])
    while total(NursingVitalSign) < MIN_REGISTROS:
        idx = total(NursingVitalSign) + 1
        record = registros[(idx - 1) % len(registros)]
        NursingVitalSign.objects.create(
            tenant=record.tenant,
            name=f"Sinal Vital Seed {idx}",
            record=record,
            temperature_c=Decimal("36.5"),
            heart_rate=75 + idx,
            respiratory_rate=18,
            oxygen_saturation=98,
            blood_pressure="120/80",
        )

    while total(Procedure) < MIN_REGISTROS:
        idx = total(Procedure) + 1
        patient = pacientes[(idx - 1) % len(pacientes)]
        Procedure.objects.create(
            tenant=patient.tenant,
            patient=patient,
            professional=users[(idx - 1) % len(users)],
            notes=f"Procedimento seed {idx}",
        )

    while total(ProcedureCatalog) < MIN_REGISTROS:
        idx = total(ProcedureCatalog) + 1
        patient = pacientes[(idx - 1) % len(pacientes)]
        ProcedureCatalog.objects.create(
            tenant=patient.tenant,
            name=f"Procedimento Catálogo {idx}",
            description=f"Descrição catálogo seed {idx}",
            default_price=Decimal("350.00") + Decimal(idx),
        )

    catalogos = list(ProcedureCatalog.objects.order_by("id"))
    while total(ProcedureCatalogMaterial) < MIN_REGISTROS:
        idx = total(ProcedureCatalogMaterial) + 1
        catalog = catalogos[(idx - 1) % len(catalogos)]

        product = next(
            (
                candidato
                for candidato in produtos
                if candidato.tenant_id == catalog.tenant_id
                and not ProcedureCatalogMaterial.objects.filter(catalog=catalog, product=candidato).exists()
            ),
            None,
        )
        if product is None:
            break

        ProcedureCatalogMaterial.objects.create(
            tenant=catalog.tenant,
            catalog=catalog,
            product=product,
            default_quantity=1,
            default_unit_cost=product.sale_price,
            observation=f"Material padrão seed {idx}",
        )

    procedures = list(Procedure.objects.order_by("id")[:MIN_REGISTROS])
    while total(ProcedureItem) < MIN_REGISTROS:
        idx = total(ProcedureItem) + 1
        procedure = procedures[(idx - 1) % len(procedures)]
        catalog = next(
            (c for c in catalogos if c.tenant_id == procedure.tenant_id),
            None,
        )
        ProcedureItem.objects.create(
            tenant=procedure.tenant,
            procedure=procedure,
            catalog=catalog,
            description="" if catalog else f"Item de procedure seed {idx}",
            quantity=1,
            unit_price=Decimal("0.00") if catalog else Decimal("150.00"),
            performed=True,
            observation=f"Observação seed {idx}",
        )

    lotes = list(Lot.objects.select_related("product").order_by("expiration_date", "id"))

    while total(ProcedureMaterial) < MIN_REGISTROS:
        idx = total(ProcedureMaterial) + 1
        procedure = procedures[(idx - 1) % len(procedures)]
        lot = next(
            (
                candidato
                for candidato in lotes
                if candidato.tenant_id == procedure.tenant_id and candidato.saldo() > 0
            ),
            None,
        )
        if lot is None:
            break

        ProcedureMaterial.objects.create(
            tenant=procedure.tenant,
            procedure=procedure,
            product=lot.product,
            lot=lot,
            quantity=1,
            unit_cost=lot.product.sale_price,
            observation=f"Material seed {idx}",
        )

    for item in ProcedureItem.objects.filter(deleted=False):
        if not ProcedureItemValue.objects.filter(item=item, deleted=False).exists():
            item.save()

    for material in ProcedureMaterial.objects.filter(deleted=False):
        if not ProcedureMaterialValue.objects.filter(material=material, deleted=False).exists():
            material.save()


def ensure_insurer(tenants):
    while total(Insurer) < MIN_REGISTROS:
        idx = total(Insurer) + 1
        tenant = tenants[(idx - 1) % len(tenants)]
        Insurer.objects.create(
            tenant=tenant,
            name=f"Seguradora Seed {idx}",
            external_code=f"SEG-{idx:03d}",
            email=f"insurer{idx}@example.com",
            phone=f"840200{idx:03d}",
            active=True,
        )

    seguradoras = list(Insurer.objects.order_by("id"))

    while total(CoveragePlan) < MIN_REGISTROS:
        idx = total(CoveragePlan) + 1
        seg = seguradoras[(idx - 1) % len(seguradoras)]
        CoveragePlan.objects.create(
            tenant=seg.tenant,
            name=f"Plano Seed {idx}",
            insurer=seg,
            coverage_percentage=Decimal("80.00"),
            requires_authorization=idx % 2 == 0,
        )

    planos = list(CoveragePlan.objects.order_by("id"))

    while total(ProcedureAuthorization) < MIN_REGISTROS:
        idx = total(ProcedureAuthorization) + 1
        plan = planos[(idx - 1) % len(planos)]
        ProcedureAuthorization.objects.create(
            tenant=plan.tenant,
            name=f"Autorização Seed {idx}",
            request_id=uuid4(),
            plan=plan,
        )


def ensure_billing():
    requisicoes = list(LabRequest.objects.order_by("id")[:MIN_REGISTROS])
    exams = list(LabExam.objects.order_by("id"))

    for req in requisicoes:
        Invoice.objects.get_or_create(
            request=req,
            defaults={
                "tenant": req.tenant,
                "patient": req.patient,
            },
        )

    faturas = list(Invoice.objects.order_by("id"))

    for idx, invoice in enumerate(faturas, start=1):
        exam = exams[(idx - 1) % len(exams)]
        InvoiceItem.objects.get_or_create(
            invoice=invoice,
            exam=exam,
            defaults={
                "tenant": invoice.tenant,
                "description": exam.name,
                "quantity": Decimal("1.00"),
            },
        )

    while total(InvoiceHistory) < MIN_REGISTROS:
        idx = total(InvoiceHistory) + 1
        invoice = faturas[(idx - 1) % len(faturas)]
        InvoiceHistory.objects.create(
            tenant=invoice.tenant,
            name=f"Histórico Seed {idx}",
            invoice=invoice,
            description=f"Evento de histórico seed {idx}",
            event_type="SEED",
        )


def ensure_payments():
    method = choice_value(Payment, "method")
    faturas = list(Invoice.objects.order_by("id")[:MIN_REGISTROS])

    while total(Payment) < MIN_REGISTROS:
        idx = total(Payment) + 1
        invoice = faturas[(idx - 1) % len(faturas)]
        value = invoice.total if invoice.total and invoice.total > 0 else Decimal("100.00")
        Payment.objects.create(
            tenant=invoice.tenant,
            name=f"Pagamento Seed {idx}",
            invoice=invoice,
            value=value,
            method=method,
            external_reference=f"PG-SEED-{idx:04d}",
        )

    while total(Transaction) < MIN_REGISTROS:
        idx = total(Transaction) + 1
        Transaction.objects.create(
            external_reference=f"TX-SEED-{idx:04d}",
            gateway="SEED_GATEWAY",
            status="confirmada",
            gateway_response={"seed": idx},
        )

    pagamentos = list(Payment.objects.order_by("id")[:MIN_REGISTROS])
    transacoes = list(Transaction.objects.order_by("id")[:MIN_REGISTROS])

    while total(Receipt) < MIN_REGISTROS:
        idx = total(Receipt) + 1
        payment = pagamentos[(idx - 1) % len(pagamentos)]
        Receipt.objects.create(
            invoice=payment.invoice,
            payment=payment,
            number=f"RCB-SEED-{idx:04d}",
            value=payment.value,
        )

    while total(Reconciliation) < MIN_REGISTROS:
        idx = total(Reconciliation) + 1
        transaction = transacoes[(idx - 1) % len(transacoes)]
        Reconciliation.objects.create(
            transaction=transaction,
            confirmed=idx % 2 == 0,
            confirmation_date=timezone.now() if idx % 2 == 0 else None,
        )


def ensure_contabilidade(tenants):
    type_account = choice_value(Account, "type")
    contas = list(Account.objects.order_by("id"))

    while total(Account) < MIN_REGISTROS:
        idx = total(Account) + 1
        tenant = tenants[(idx - 1) % len(tenants)]
        account = Account.objects.create(
            tenant=tenant,
            name=f"Conta Seed {idx}",
            type=type_account,
        )
        contas.append(account)

    contas = list(Account.objects.order_by("id")[:MIN_REGISTROS])

    while total(LegacyEntry) < MIN_REGISTROS:
        idx = total(LegacyEntry) + 1
        tenant = tenants[(idx - 1) % len(tenants)]
        LegacyEntry.objects.create(
            tenant=tenant,
            name=f"Lançamento Seed {idx}",
            description=f"Lançamento de seed {idx}",
            external_reference=f"LANC-SEED-{idx:04d}",
        )

    lancamentos = list(LegacyEntry.objects.order_by("id")[:MIN_REGISTROS])

    for idx, entry in enumerate(lancamentos, start=1):
        contas_tenant = [c for c in contas if c.tenant_id == entry.tenant_id]
        account_debit = contas_tenant[0]
        account_credit = contas_tenant[-1]

        if not LegacyMovement.objects.filter(entry=entry, debit__gt=0).exists():
            LegacyMovement.objects.create(
                tenant=entry.tenant,
                name=f"Mov Deb Seed {idx}",
                entry=entry,
                account=account_debit,
                debit=Decimal("100.00"),
                credit=Decimal("0.00"),
            )

        if not LegacyMovement.objects.filter(entry=entry, credit__gt=0).exists():
            LegacyMovement.objects.create(
                tenant=entry.tenant,
                name=f"Mov Cred Seed {idx}",
                entry=entry,
                account=account_credit,
                debit=Decimal("0.00"),
                credit=Decimal("100.00"),
            )

    while total(LedgerEntry) < MIN_REGISTROS:
        idx = total(LedgerEntry) + 1
        tenant = tenants[(idx - 1) % len(tenants)]
        LedgerEntry.objects.create(
            tenant=tenant,
            name=f"Ledger Entry Seed {idx}",
            external_reference=f"LED-REF-{idx:04d}",
            idempotency_key=f"LED-IDEMP-{idx:04d}",
            accounting_date=timezone.localdate(),
            description=f"Entry de seed {idx}",
        )

    entries = list(LedgerEntry.objects.order_by("id")[:MIN_REGISTROS])

    for idx, entry in enumerate(entries, start=1):
        account_debit = next(c for c in contas if c.tenant_id == entry.tenant_id)
        account_credit = [c for c in contas if c.tenant_id == entry.tenant_id][-1]

        if not LedgerLine.objects.filter(entry=entry, nature="D").exists():
            LedgerLine.objects.create(
                tenant=entry.tenant,
                name=f"Linha D Seed {idx}",
                entry=entry,
                account=account_debit,
                value=Decimal("50.00"),
                nature="D",
            )

        if not LedgerLine.objects.filter(entry=entry, nature="C").exists():
            LedgerLine.objects.create(
                tenant=entry.tenant,
                name=f"Linha C Seed {idx}",
                entry=entry,
                account=account_credit,
                value=Decimal("50.00"),
                nature="C",
            )

    for account in contas:
        AccountBalance.objects.get_or_create(account=account)

    faturas = list(Invoice.objects.order_by("id")[:MIN_REGISTROS])
    while total(FinancialReconciliation) < MIN_REGISTROS:
        idx = total(FinancialReconciliation) + 1
        invoice = faturas[(idx - 1) % len(faturas)]
        FinancialReconciliation.objects.create(
            tenant=invoice.tenant,
            name=f"Conciliação Seed {idx}",
            invoice=invoice,
            accounting_value=Decimal("100.00"),
            received_amount=Decimal("100.00"),
            discrepancy=Decimal("0.00"),
            reconciled=True,
            external_reference=f"CON-SEED-{idx:04d}",
        )


def ensure_farmacia(tenants):
    categorias = list(ProductCategory.objects.order_by("id"))

    while total(Product) < MIN_REGISTROS:
        idx = total(Product) + 1
        category = categorias[(idx - 1) % len(categorias)]
        Product.objects.create(
            tenant=category.tenant,
            name=f"Produto Seed {idx}",
            category=category,
            sale_price=Decimal("25.00") + Decimal(idx),
            estoque_minimo=5,
        )

    produtos = list(Product.objects.order_by("id"))

    while total(Lot) < MIN_REGISTROS:
        idx = total(Lot) + 1
        product = produtos[(idx - 1) % len(produtos)]
        Lot.objects.create(
            tenant=product.tenant,
            name=f"Lote Seed {idx}",
            product=product,
            lot_number=f"SEED-LOT-{idx:04d}",
            expiration_date=timezone.localdate() + timedelta(days=365 + idx),
            initial_quantity=100,
        )

    while total(Sale) < MIN_REGISTROS:
        idx = total(Sale) + 1
        tenant = tenants[(idx - 1) % len(tenants)]
        Sale.objects.create(tenant=tenant)

    vendas = list(Sale.objects.order_by("id")[:MIN_REGISTROS])
    produtos_seed = list(Product.objects.order_by("id"))

    for idx, sale in enumerate(vendas, start=1):
        product = None
        for offset in range(len(produtos_seed)):
            candidato = produtos_seed[(idx - 1 + offset) % len(produtos_seed)]
            if candidato.tenant_id == sale.tenant_id:
                product = candidato
                break
        if product is None:
            continue

        if not SaleItem.objects.filter(sale=sale, product=product).exists():
            SaleItem.objects.create(
                tenant=sale.tenant,
                name=f"Item Venda Seed {idx}",
                sale=sale,
                product=product,
                quantity=1,
            )

    while total(SaleItem) < MIN_REGISTROS:
        product = Product.objects.order_by("id").first()
        sale = (
            Sale.objects.filter(tenant_id=product.tenant_id)
            .exclude(itens__product=product)
            .order_by("id")
            .first()
        )
        if sale is None:
            sale = Sale.objects.create(tenant_id=product.tenant_id)
        SaleItem.objects.create(
            tenant=product.tenant,
            name=f"Item Extra Seed {total(SaleItem) + 1}",
            sale=sale,
            product=product,
            quantity=1,
        )

    while total(InventoryMovement) < MIN_REGISTROS:
        idx = total(InventoryMovement) + 1
        lot = Lot.objects.order_by("id").first()
        InventoryMovement.objects.create(
            tenant=lot.tenant,
            name=f"Movimento Seed {idx}",
            lot=lot,
            type=TipoMovimento.ENTRADA,
            quantity=1,
        )


def ensure_identidade(users):
    for idx, user in enumerate(users, start=1):
        ProfessionalProfile.objects.get_or_create(
            user=user,
            defaults={
                "role": "Analista",
                "professional_registration": f"REG-SEED-{idx:04d}",
                "department": "Laboratório",
            },
        )

    while PasswordResetToken.objects.count() < MIN_REGISTROS:
        idx = PasswordResetToken.objects.count() + 1
        user = users[(idx - 1) % len(users)]
        PasswordResetToken.objects.create(user=user)


def ensure_notifications():
    while NotificationTemplate.objects.count() < MIN_REGISTROS:
        idx = NotificationTemplate.objects.count() + 1
        NotificationTemplate.objects.create(
            name=f"Template Seed {idx}",
            content=f"Conteúdo seed {idx}",
        )

    while Notification.objects.count() < MIN_REGISTROS:
        idx = Notification.objects.count() + 1
        Notification.objects.create(
            recipient=f"recipient{idx}@example.com",
            channel="email",
            message=f"Mensagem seed {idx}",
            sent=idx % 2 == 0,
        )

    notificacoes = list(Notification.objects.order_by("id")[:MIN_REGISTROS])
    while DeliveryLog.objects.count() < MIN_REGISTROS:
        idx = DeliveryLog.objects.count() + 1
        notification = notificacoes[(idx - 1) % len(notificacoes)]
        DeliveryLog.objects.create(
            notification=notification,
            status="enviado",
            response=f"Resposta seed {idx}",
        )


def report():
    faltando = []
    app_configs = sorted(
        [cfg for cfg in apps.get_app_configs() if cfg.name.startswith("apps.")],
        key=lambda c: c.label,
    )
    for cfg in app_configs:
        for model in cfg.get_models():
            if model._meta.abstract or model._meta.proxy:
                continue
            qtd = total(model)
            if qtd < MIN_REGISTROS:
                faltando.append(f"{cfg.label}.{model.__name__} ({qtd})")

    if faltando:
        for _item in faltando:
            pass
    else:
        pass


def main():
    tenants = ensure_tenants()
    users = ensure_users()
    ensure_config_uso(tenants)
    ensure_clinical(tenants, users)
    ensure_farmacia(tenants)
    ensure_enfermagem(users)
    ensure_insurer(tenants)
    ensure_billing()
    ensure_payments()
    ensure_contabilidade(tenants)
    ensure_identidade(users)
    ensure_notifications()
    report()


main()
