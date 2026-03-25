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
        identificador = unique_str(Tenant, "identificador", "seed-inq-")
        Tenant.objects.create(
            identificador=identificador,
            nome=f"Inquilino Seed {idx}",
            ativo=True,
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
            telefone=f"840000{idx:03d}",
            is_active=True,
        )

    return list(User.objects.order_by("id")[:MIN_REGISTROS])


def ensure_config_uso(tenants):
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
                "usuarios_ativos": 5 + idx,
                "requisicoes_mes_atual": 10 * idx,
            },
        )


def ensure_clinical(tenants, users):
    metodo = choice_value(LabExam, "metodo")
    setor = choice_value(LabExam, "setor")
    tipo_resultado = choice_value(LabExamField, "tipo")
    unidade = choice_value(LabExamField, "unidade")
    genero = choice_value(Patient, "genero")
    raca = choice_value(Patient, "raca_origem")
    tipo_documento = choice_value(Patient, "tipo_documento")
    proveniencia = choice_value(Patient, "proveniencia")

    while total(LabExam) < MIN_REGISTROS:
        idx = total(LabExam) + 1
        tenant = tenants[(idx - 1) % len(tenants)]
        LabExam.objects.create(
            inquilino=tenant,
            nome=f"Exame Seed {idx}",
            trl_horas=24 + idx,
            preco=Decimal("50.00") + Decimal(idx),
            metodo=metodo,
            setor=setor,
        )

    exames = list(LabExam.objects.order_by("id"))

    while total(LabExamField) < MIN_REGISTROS:
        idx = total(LabExamField) + 1
        exame = exames[(idx - 1) % len(exames)]
        LabExamField.objects.create(
            inquilino=exame.inquilino,
            nome=f"Campo Seed {idx}",
            exame=exame,
            tipo=tipo_resultado,
            unidade=unidade,
            referencia_min=Decimal("4.00"),
            referencia_max=Decimal("10.00"),
            critico_min=Decimal("2.00"),
            critico_max=Decimal("20.00"),
        )

    while total(Patient) < MIN_REGISTROS:
        idx = total(Patient) + 1
        tenant = tenants[(idx - 1) % len(tenants)]
        Patient.objects.create(
            inquilino=tenant,
            nome=f"Paciente Seed {idx}",
            morada=f"Rua Seed {idx}",
            genero=genero,
            raca_origem=raca,
            tipo_documento=tipo_documento,
            numero_id=f"SEED-ID-{idx:04d}",
            contacto=f"840100{idx:03d}",
            email=f"paciente.seed{idx}@example.com",
            proveniencia=proveniencia,
            data_nascimento=date(1990, 1, 1) + timedelta(days=30 * idx),
        )

    pacientes = list(Patient.objects.order_by("id"))

    while total(LabRequest) < MIN_REGISTROS:
        idx = total(LabRequest) + 1
        paciente = pacientes[(idx - 1) % len(pacientes)]
        analista = users[(idx - 1) % len(users)]
        LabRequest.objects.create(
            inquilino=paciente.inquilino,
            paciente=paciente,
            analista=analista,
        )

    requisicoes = list(LabRequest.objects.order_by("id")[:MIN_REGISTROS])
    exames_seed = list(LabExam.objects.order_by("id")[:MIN_REGISTROS])

    for idx, req in enumerate(requisicoes, start=1):
        exame = exames_seed[(idx - 1) % len(exames_seed)]
        LabRequestItem.objects.get_or_create(
            requisicao=req,
            exame=exame,
            defaults={"inquilino": req.inquilino},
        )

    if total(LabRequestItem) < MIN_REGISTROS:
        for req in requisicoes:
            for exame in exames_seed:
                if total(LabRequestItem) >= MIN_REGISTROS:
                    break
                LabRequestItem.objects.get_or_create(
                    requisicao=req,
                    exame=exame,
                    defaults={"inquilino": req.inquilino},
                )
            if total(LabRequestItem) >= MIN_REGISTROS:
                break

    for idx, req in enumerate(requisicoes, start=1):
        Result.objects.get_or_create(
            requisicao=req,
            defaults={
                "inquilino": req.inquilino,
                "analista": users[(idx - 1) % len(users)],
            },
        )

    resultados = list(Result.objects.order_by("id"))
    campos = list(LabExamField.objects.order_by("id"))

    for idx in range(max(len(resultados), len(campos))):
        if total(ResultItem) >= MIN_REGISTROS:
            break
        resultado = resultados[idx % len(resultados)]
        campo = campos[idx % len(campos)]
        ResultItem.objects.get_or_create(
            resultado=resultado,
            exame_campo=campo,
            defaults={"inquilino": resultado.inquilino},
        )

    while total(ClinicalReference) < MIN_REGISTROS:
        idx = total(ClinicalReference) + 1
        campo = campos[(idx - 1) % len(campos)]
        ClinicalReference.objects.create(
            inquilino=campo.inquilino,
            nome=f"Referência Seed {idx}",
            exame_campo=campo,
            idade_minima_dias=0,
            idade_maxima_dias=36500,
            valor_minimo=Decimal("4.00"),
            valor_maximo=Decimal("10.00"),
            critico_baixo=Decimal("2.00"),
            critico_alto=Decimal("20.00"),
        )


def ensure_enfermagem(users):
    pacientes = list(Patient.objects.order_by("id")[:MIN_REGISTROS])
    produtos = list(Product.objects.order_by("id"))

    prioridade = choice_value(NursingRecord, "prioridade")

    while total(NursingRecord) < MIN_REGISTROS:
        idx = total(NursingRecord) + 1
        paciente = pacientes[(idx - 1) % len(pacientes)]
        NursingRecord.objects.create(
            inquilino=paciente.inquilino,
            nome=f"Registro Enfermagem Seed {idx}",
            paciente=paciente,
            prioridade=prioridade,
            observacao=f"Observação de enfermagem seed {idx}",
        )

    registros = list(NursingRecord.objects.order_by("id")[:MIN_REGISTROS])
    while total(NursingVitalSign) < MIN_REGISTROS:
        idx = total(NursingVitalSign) + 1
        registro = registros[(idx - 1) % len(registros)]
        NursingVitalSign.objects.create(
            inquilino=registro.inquilino,
            nome=f"Sinal Vital Seed {idx}",
            registro=registro,
            temperatura_c=Decimal("36.5"),
            frequencia_cardiaca=75 + idx,
            frequencia_respiratoria=18,
            saturacao_oxigenio=98,
            pressao_arterial="120/80",
        )

    while total(Procedure) < MIN_REGISTROS:
        idx = total(Procedure) + 1
        paciente = pacientes[(idx - 1) % len(pacientes)]
        Procedure.objects.create(
            inquilino=paciente.inquilino,
            paciente=paciente,
            profissional=users[(idx - 1) % len(users)],
            observacoes=f"Procedimento seed {idx}",
        )

    while total(ProcedureCatalog) < MIN_REGISTROS:
        idx = total(ProcedureCatalog) + 1
        paciente = pacientes[(idx - 1) % len(pacientes)]
        ProcedureCatalog.objects.create(
            inquilino=paciente.inquilino,
            nome=f"Procedimento Catálogo {idx}",
            descricao=f"Descrição catálogo seed {idx}",
            preco_padrao=Decimal("350.00") + Decimal(idx),
        )

    catalogos = list(ProcedureCatalog.objects.order_by("id"))
    while total(ProcedureCatalogMaterial) < MIN_REGISTROS:
        idx = total(ProcedureCatalogMaterial) + 1
        catalogo = catalogos[(idx - 1) % len(catalogos)]

        produto = next(
            (
                candidato
                for candidato in produtos
                if candidato.inquilino_id == catalogo.inquilino_id
                and not ProcedureCatalogMaterial.objects.filter(catalogo=catalogo, produto=candidato).exists()
            ),
            None,
        )
        if produto is None:
            break

        ProcedureCatalogMaterial.objects.create(
            inquilino=catalogo.inquilino,
            catalogo=catalogo,
            produto=produto,
            quantidade_padrao=1,
            custo_unitario_padrao=produto.preco_venda,
            observacao=f"Material padrão seed {idx}",
        )

    procedimentos = list(Procedure.objects.order_by("id")[:MIN_REGISTROS])
    while total(ProcedureItem) < MIN_REGISTROS:
        idx = total(ProcedureItem) + 1
        procedimento = procedimentos[(idx - 1) % len(procedimentos)]
        catalogo = next(
            (c for c in catalogos if c.inquilino_id == procedimento.inquilino_id),
            None,
        )
        ProcedureItem.objects.create(
            inquilino=procedimento.inquilino,
            procedimento=procedimento,
            catalogo=catalogo,
            descricao="" if catalogo else f"Item de procedimento seed {idx}",
            quantidade=1,
            preco_unitario=Decimal("0.00") if catalogo else Decimal("150.00"),
            realizado=True,
            observacao=f"Observação seed {idx}",
        )

    lotes = list(Lot.objects.select_related("produto").order_by("validade", "id"))

    while total(ProcedureMaterial) < MIN_REGISTROS:
        idx = total(ProcedureMaterial) + 1
        procedimento = procedimentos[(idx - 1) % len(procedimentos)]
        lote = next(
            (
                candidato
                for candidato in lotes
                if candidato.inquilino_id == procedimento.inquilino_id and candidato.saldo() > 0
            ),
            None,
        )
        if lote is None:
            break

        ProcedureMaterial.objects.create(
            inquilino=procedimento.inquilino,
            procedimento=procedimento,
            produto=lote.produto,
            lote=lote,
            quantidade=1,
            custo_unitario=lote.produto.preco_venda,
            observacao=f"Material seed {idx}",
        )

    for item in ProcedureItem.objects.filter(deletado=False):
        if not ProcedureItemValue.objects.filter(item=item, deletado=False).exists():
            item.save()

    for material in ProcedureMaterial.objects.filter(deletado=False):
        if not ProcedureMaterialValue.objects.filter(material=material, deletado=False).exists():
            material.save()


def ensure_insurer(tenants):
    while total(Insurer) < MIN_REGISTROS:
        idx = total(Insurer) + 1
        tenant = tenants[(idx - 1) % len(tenants)]
        Insurer.objects.create(
            inquilino=tenant,
            nome=f"Seguradora Seed {idx}",
            codigo_externo=f"SEG-{idx:03d}",
            email=f"seguradora{idx}@example.com",
            telefone=f"840200{idx:03d}",
            ativa=True,
        )

    seguradoras = list(Insurer.objects.order_by("id"))

    while total(CoveragePlan) < MIN_REGISTROS:
        idx = total(CoveragePlan) + 1
        seg = seguradoras[(idx - 1) % len(seguradoras)]
        CoveragePlan.objects.create(
            inquilino=seg.inquilino,
            nome=f"Plano Seed {idx}",
            seguradora=seg,
            percentual_cobertura=Decimal("80.00"),
            exige_autorizacao=idx % 2 == 0,
        )

    planos = list(CoveragePlan.objects.order_by("id"))

    while total(ProcedureAuthorization) < MIN_REGISTROS:
        idx = total(ProcedureAuthorization) + 1
        plano = planos[(idx - 1) % len(planos)]
        ProcedureAuthorization.objects.create(
            inquilino=plano.inquilino,
            nome=f"Autorização Seed {idx}",
            requisicao_id=uuid4(),
            plano=plano,
        )


def ensure_billing():
    requisicoes = list(LabRequest.objects.order_by("id")[:MIN_REGISTROS])
    exames = list(LabExam.objects.order_by("id"))

    for req in requisicoes:
        Invoice.objects.get_or_create(
            requisicao=req,
            defaults={
                "inquilino": req.inquilino,
                "paciente": req.paciente,
            },
        )

    faturas = list(Invoice.objects.order_by("id"))

    for idx, fatura in enumerate(faturas, start=1):
        exame = exames[(idx - 1) % len(exames)]
        InvoiceItem.objects.get_or_create(
            fatura=fatura,
            exame=exame,
            defaults={
                "inquilino": fatura.inquilino,
                "descricao": exame.nome,
                "quantidade": Decimal("1.00"),
            },
        )

    while total(InvoiceHistory) < MIN_REGISTROS:
        idx = total(InvoiceHistory) + 1
        fatura = faturas[(idx - 1) % len(faturas)]
        InvoiceHistory.objects.create(
            inquilino=fatura.inquilino,
            nome=f"Histórico Seed {idx}",
            fatura=fatura,
            descricao=f"Evento de histórico seed {idx}",
            tipo_evento="SEED",
        )


def ensure_payments():
    metodo = choice_value(Payment, "metodo")
    faturas = list(Invoice.objects.order_by("id")[:MIN_REGISTROS])

    while total(Payment) < MIN_REGISTROS:
        idx = total(Payment) + 1
        fatura = faturas[(idx - 1) % len(faturas)]
        valor = fatura.total if fatura.total and fatura.total > 0 else Decimal("100.00")
        Payment.objects.create(
            inquilino=fatura.inquilino,
            nome=f"Pagamento Seed {idx}",
            fatura=fatura,
            valor=valor,
            metodo=metodo,
            referencia_externa=f"PG-SEED-{idx:04d}",
        )

    while total(Transaction) < MIN_REGISTROS:
        idx = total(Transaction) + 1
        Transaction.objects.create(
            referencia_externa=f"TX-SEED-{idx:04d}",
            gateway="SEED_GATEWAY",
            status="confirmada",
            resposta_gateway={"seed": idx},
        )

    pagamentos = list(Payment.objects.order_by("id")[:MIN_REGISTROS])
    transacoes = list(Transaction.objects.order_by("id")[:MIN_REGISTROS])

    while total(Receipt) < MIN_REGISTROS:
        idx = total(Receipt) + 1
        pagamento = pagamentos[(idx - 1) % len(pagamentos)]
        Receipt.objects.create(
            fatura=pagamento.fatura,
            pagamento=pagamento,
            numero=f"RCB-SEED-{idx:04d}",
            valor=pagamento.valor,
        )

    while total(Reconciliation) < MIN_REGISTROS:
        idx = total(Reconciliation) + 1
        transacao = transacoes[(idx - 1) % len(transacoes)]
        Reconciliation.objects.create(
            transacao=transacao,
            confirmado=idx % 2 == 0,
            data_confirmacao=timezone.now() if idx % 2 == 0 else None,
        )


def ensure_contabilidade(tenants):
    tipo_conta = choice_value(Account, "tipo")
    contas = list(Account.objects.order_by("id"))

    while total(Account) < MIN_REGISTROS:
        idx = total(Account) + 1
        tenant = tenants[(idx - 1) % len(tenants)]
        conta = Account.objects.create(
            inquilino=tenant,
            nome=f"Conta Seed {idx}",
            tipo=tipo_conta,
        )
        contas.append(conta)

    contas = list(Account.objects.order_by("id")[:MIN_REGISTROS])

    while total(LegacyEntry) < MIN_REGISTROS:
        idx = total(LegacyEntry) + 1
        tenant = tenants[(idx - 1) % len(tenants)]
        LegacyEntry.objects.create(
            inquilino=tenant,
            nome=f"Lançamento Seed {idx}",
            descricao=f"Lançamento de seed {idx}",
            referencia_externa=f"LANC-SEED-{idx:04d}",
        )

    lancamentos = list(LegacyEntry.objects.order_by("id")[:MIN_REGISTROS])

    for idx, lancamento in enumerate(lancamentos, start=1):
        contas_tenant = [c for c in contas if c.inquilino_id == lancamento.inquilino_id]
        conta_debito = contas_tenant[0]
        conta_credito = contas_tenant[-1]

        if not LegacyMovement.objects.filter(lancamento=lancamento, debito__gt=0).exists():
            LegacyMovement.objects.create(
                inquilino=lancamento.inquilino,
                nome=f"Mov Deb Seed {idx}",
                lancamento=lancamento,
                conta=conta_debito,
                debito=Decimal("100.00"),
                credito=Decimal("0.00"),
            )

        if not LegacyMovement.objects.filter(lancamento=lancamento, credito__gt=0).exists():
            LegacyMovement.objects.create(
                inquilino=lancamento.inquilino,
                nome=f"Mov Cred Seed {idx}",
                lancamento=lancamento,
                conta=conta_credito,
                debito=Decimal("0.00"),
                credito=Decimal("100.00"),
            )

    while total(LedgerEntry) < MIN_REGISTROS:
        idx = total(LedgerEntry) + 1
        tenant = tenants[(idx - 1) % len(tenants)]
        LedgerEntry.objects.create(
            inquilino=tenant,
            nome=f"Ledger Entry Seed {idx}",
            referencia_externa=f"LED-REF-{idx:04d}",
            idempotency_key=f"LED-IDEMP-{idx:04d}",
            data_contabil=timezone.localdate(),
            descricao=f"Entry de seed {idx}",
        )

    entries = list(LedgerEntry.objects.order_by("id")[:MIN_REGISTROS])

    for idx, entry in enumerate(entries, start=1):
        conta_debito = next(c for c in contas if c.inquilino_id == entry.inquilino_id)
        conta_credito = [c for c in contas if c.inquilino_id == entry.inquilino_id][-1]

        if not LedgerLine.objects.filter(entry=entry, natureza="D").exists():
            LedgerLine.objects.create(
                inquilino=entry.inquilino,
                nome=f"Linha D Seed {idx}",
                entry=entry,
                conta=conta_debito,
                valor=Decimal("50.00"),
                natureza="D",
            )

        if not LedgerLine.objects.filter(entry=entry, natureza="C").exists():
            LedgerLine.objects.create(
                inquilino=entry.inquilino,
                nome=f"Linha C Seed {idx}",
                entry=entry,
                conta=conta_credito,
                valor=Decimal("50.00"),
                natureza="C",
            )

    for conta in contas:
        AccountBalance.objects.get_or_create(conta=conta)

    faturas = list(Invoice.objects.order_by("id")[:MIN_REGISTROS])
    while total(FinancialReconciliation) < MIN_REGISTROS:
        idx = total(FinancialReconciliation) + 1
        fatura = faturas[(idx - 1) % len(faturas)]
        FinancialReconciliation.objects.create(
            inquilino=fatura.inquilino,
            nome=f"Conciliação Seed {idx}",
            fatura=fatura,
            valor_contabil=Decimal("100.00"),
            valor_recebido=Decimal("100.00"),
            divergencia=Decimal("0.00"),
            conciliado=True,
            referencia_externa=f"CON-SEED-{idx:04d}",
        )


def ensure_farmacia(tenants):
    categorias = list(ProductCategory.objects.order_by("id"))

    while total(Product) < MIN_REGISTROS:
        idx = total(Product) + 1
        categoria = categorias[(idx - 1) % len(categorias)]
        Product.objects.create(
            inquilino=categoria.inquilino,
            nome=f"Produto Seed {idx}",
            categoria=categoria,
            preco_venda=Decimal("25.00") + Decimal(idx),
            estoque_minimo=5,
        )

    produtos = list(Product.objects.order_by("id"))

    while total(Lot) < MIN_REGISTROS:
        idx = total(Lot) + 1
        produto = produtos[(idx - 1) % len(produtos)]
        Lot.objects.create(
            inquilino=produto.inquilino,
            nome=f"Lote Seed {idx}",
            produto=produto,
            numero_lote=f"SEED-LOT-{idx:04d}",
            validade=timezone.localdate() + timedelta(days=365 + idx),
            quantidade_inicial=100,
        )

    while total(Sale) < MIN_REGISTROS:
        idx = total(Sale) + 1
        tenant = tenants[(idx - 1) % len(tenants)]
        Sale.objects.create(inquilino=tenant)

    vendas = list(Sale.objects.order_by("id")[:MIN_REGISTROS])
    produtos_seed = list(Product.objects.order_by("id"))

    for idx, venda in enumerate(vendas, start=1):
        produto = None
        for offset in range(len(produtos_seed)):
            candidato = produtos_seed[(idx - 1 + offset) % len(produtos_seed)]
            if candidato.inquilino_id == venda.inquilino_id:
                produto = candidato
                break
        if produto is None:
            continue

        if not SaleItem.objects.filter(venda=venda, produto=produto).exists():
            SaleItem.objects.create(
                inquilino=venda.inquilino,
                nome=f"Item Venda Seed {idx}",
                venda=venda,
                produto=produto,
                quantidade=1,
            )

    while total(SaleItem) < MIN_REGISTROS:
        produto = Product.objects.order_by("id").first()
        venda = (
            Sale.objects.filter(inquilino_id=produto.inquilino_id)
            .exclude(itens__produto=produto)
            .order_by("id")
            .first()
        )
        if venda is None:
            venda = Sale.objects.create(inquilino_id=produto.inquilino_id)
        SaleItem.objects.create(
            inquilino=produto.inquilino,
            nome=f"Item Extra Seed {total(SaleItem) + 1}",
            venda=venda,
            produto=produto,
            quantidade=1,
        )

    while total(InventoryMovement) < MIN_REGISTROS:
        idx = total(InventoryMovement) + 1
        lote = Lot.objects.order_by("id").first()
        InventoryMovement.objects.create(
            inquilino=lote.inquilino,
            nome=f"Movimento Seed {idx}",
            lote=lote,
            tipo=TipoMovimento.ENTRADA,
            quantidade=1,
        )


def ensure_identidade(users):
    for idx, user in enumerate(users, start=1):
        ProfessionalProfile.objects.get_or_create(
            usuario=user,
            defaults={
                "cargo": "Analista",
                "registro_profissional": f"REG-SEED-{idx:04d}",
                "departamento": "Laboratório",
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
            nome=f"Template Seed {idx}",
            conteudo=f"Conteúdo seed {idx}",
        )

    while Notification.objects.count() < MIN_REGISTROS:
        idx = Notification.objects.count() + 1
        Notification.objects.create(
            destinatario=f"destinatario{idx}@example.com",
            canal="email",
            mensagem=f"Mensagem seed {idx}",
            enviada=idx % 2 == 0,
        )

    notificacoes = list(Notification.objects.order_by("id")[:MIN_REGISTROS])
    while DeliveryLog.objects.count() < MIN_REGISTROS:
        idx = DeliveryLog.objects.count() + 1
        notificacao = notificacoes[(idx - 1) % len(notificacoes)]
        DeliveryLog.objects.create(
            notificacao=notificacao,
            status="enviado",
            resposta=f"Resposta seed {idx}",
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
