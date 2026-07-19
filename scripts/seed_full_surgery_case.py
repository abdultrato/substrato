from __future__ import annotations

from datetime import date, timedelta
from decimal import Decimal

from django.db import transaction
from django.utils import timezone

from apps.billing.models.invoice import Invoice
from apps.billing.models.invoice_items import InvoiceItem
from apps.clinical.models.patient import Patient
from apps.consultations.models.consultation_specialty import ConsultationSpecialty
from apps.human_resources.models.employee import Employee
from apps.pharmacy.models.product import Product
from apps.pharmacy.models.product_category import ProductCategory
from apps.surgery.models import (
    AnesthesiaRecord,
    OperatingRoom,
    OperativeReport,
    PreoperativeAssessment,
    RecoveryRecord,
    Surgery,
    SurgeryProcedureItem,
    SurgicalAuditEvent,
    SurgicalAuthorization,
    SurgicalBillingItem,
    SurgicalConsumption,
    SurgicalDocument,
    SurgicalMaterial,
    SurgicalProcedure,
    SurgicalRequest,
    SurgicalSafetyChecklist,
    SurgicalSchedule,
    SurgicalSpecimen,
    SurgicalTeamMember,
)
from apps.tenants.models.tenant import Tenant


TENANT_ID = 17
MARK = "CASO-CIRURGICO-COMPLETO-20260719"


def money(value: str) -> Decimal:
    return Decimal(value).quantize(Decimal("0.01"))


def get_tenant() -> Tenant:
    return Tenant.objects.filter(id=TENANT_ID).first() or Tenant.objects.order_by("id").first()


def ensure_employee(tenant: Tenant, name: str, suffix: str, **extra) -> Employee:
    employee, _ = Employee.objects.update_or_create(
        tenant=tenant,
        document_number=f"{MARK}-{suffix}",
        defaults={
            "name": name,
            "gender": extra.get("gender", Employee.Gender.MALE),
            "email": f"{suffix.lower()}@cirurgia.seed.local",
            "phone": extra.get("phone", "840000000"),
            "address": "Av. Eduardo Mondlane, Maputo",
            "status": Employee.Status.ACTIVE,
            "nationality": "Moçambicana",
            "document_type": Employee.DocumentType.BI,
            "nuit": f"400{suffix[-3:].zfill(6)}",
        },
    )
    return employee


@transaction.atomic
def run():
    tenant = get_tenant()
    if tenant is None:
        raise RuntimeError("Nenhum tenant encontrado.")

    now = timezone.now()
    start = now.replace(hour=8, minute=30, second=0, microsecond=0) + timedelta(days=2)
    induction = start + timedelta(minutes=10)
    incision = start + timedelta(minutes=25)
    end = start + timedelta(hours=2, minutes=20)
    recovery_in = end + timedelta(minutes=12)
    recovery_out = recovery_in + timedelta(hours=2)

    patient, _ = Patient.objects.update_or_create(
        tenant=tenant,
        document_number=f"BI-{MARK}",
        defaults={
            "name": "Amélia Sofia Mucavele",
            "birth_date": date(1981, 5, 14),
            "gender": "F",
            "blood_type": "O+",
            "race_origin": "BLACK",
            "document_type": "BI",
            "address_street": "Rua da Resistência",
            "address_number": "214",
            "address_neighborhood": "Polana Caniço",
            "address_city": "Maputo",
            "address_province": "Maputo Cidade",
            "address_country": "MZ",
            "address": "Rua da Resistência 214, Polana Caniço, Maputo",
            "contact": "+258841234567",
            "email": "amelia.mucavele.seed@substrato.local",
            "companion_name": "Dércio Mucavele",
            "companion_relationship": "Esposo",
            "companion_contact": "+258846543210",
            "provenance": "CLINICA_EXTERNA",
            "pregnant": False,
            "is_organ_donor": False,
        },
    )

    specialty, _ = ConsultationSpecialty.objects.update_or_create(
        tenant=tenant,
        name="Cirurgia Geral",
        defaults={
            "description": "Cirurgia geral abdominal e parede abdominal.",
            "base_price": money("1800.00"),
            "vat_percentage": money("5.00"),
            "active": True,
        },
    )

    surgeon = ensure_employee(tenant, "Dr. Ernesto Baloi", "CIRURGIAO-001", phone="841110001")
    assistant = ensure_employee(tenant, "Dra. Lara Sitoe", "ASSISTENTE-002", gender=Employee.Gender.FEMALE, phone="841110002")
    anesthetist = ensure_employee(tenant, "Dr. Mauro Cossa", "ANEST-003", phone="841110003")
    scrub_nurse = ensure_employee(tenant, "Enf. Joana Machava", "INST-004", gender=Employee.Gender.FEMALE, phone="841110004")
    recovery_nurse = ensure_employee(tenant, "Enf. Vasco Matusse", "REC-005", phone="841110005")

    room, _ = OperatingRoom.objects.update_or_create(
        tenant=tenant,
        code="BOCO-A-01-COMPLETO",
        defaults={
            "name": "Bloco Operatório A - Sala 01",
            "room_type": OperatingRoom.RoomType.OPERATING_ROOM,
            "status": OperatingRoom.Status.AVAILABLE,
            "location": "Piso 1, bloco cirúrgico central",
            "capacity": 1,
            "sterile": True,
            "working_hours": {"inicio": "07:00", "fim": "19:00", "dias": ["segunda", "terça", "quarta", "quinta", "sexta"]},
            "cleaning_class": "ISO 7 / sala limpa",
            "notes": "Sala equipada para laparoscopia, anestesia geral e recuperação imediata.",
        },
    )

    procedure, _ = SurgicalProcedure.objects.update_or_create(
        tenant=tenant,
        name="Hernioplastia inguinal laparoscópica",
        defaults={
            "description": "Correção laparoscópica de hérnia inguinal com colocação de tela.",
            "surgery_type": "GRANDE",
            "is_surgical": True,
            "base_price": money("85000.00"),
            "vat_percentage": money("5.00"),
            "applies_vat_by_default": True,
            "active": True,
        },
    )

    request, _ = SurgicalRequest.objects.update_or_create(
        tenant=tenant,
        patient=patient,
        requested_procedure="Hernioplastia inguinal laparoscópica direita com tela",
        defaults={
            "requesting_doctor": surgeon,
            "specialty": specialty,
            "clinical_diagnosis": "Hérnia inguinal direita sintomática, redutível, com dor aos esforços.",
            "icd_code": "K40.9",
            "requested_surgery_type": SurgicalRequest.RequestedType.MAJOR,
            "priority": SurgicalRequest.Priority.ELECTIVE,
            "justification": "Dor progressiva e limitação funcional, sem sinais de encarceramento.",
            "status": SurgicalRequest.Status.APPROVED,
            "reviewed_at": now - timedelta(days=1),
            "notes": f"{MARK} - pedido cirúrgico completo com avaliação, cirurgia e faturação.",
        },
    )

    surgery, _ = Surgery.objects.update_or_create(
        tenant=tenant,
        patient=patient,
        surgical_request=request,
        defaults={
            "specialty": specialty,
            "operating_room": room,
            "procedure": "Hernioplastia inguinal laparoscópica direita com tela",
            "description": "Caso eletivo programado a partir de pedido cirúrgico aprovado.",
            "preoperative_diagnosis": request.clinical_diagnosis,
            "postoperative_diagnosis": "Hérnia inguinal direita indireta corrigida sem intercorrências.",
            "estimated_price": money("132500.00"),
            "vat_percentage": money("5.00"),
            "applies_vat_by_default": True,
            "scheduled_for": start,
            "started_at": incision,
            "ended_at": end,
            "completed_at": end,
            "status": Surgery.Status.BILLING_PENDING,
            "surgery_size": Surgery.Size.LARGE,
            "priority": Surgery.Priority.ELECTIVE,
            "classification": Surgery.Classification.MAJOR,
        },
    )
    surgery.procedures.set([procedure])
    surgery.surgeons.set([surgeon, assistant])

    assessment, _ = PreoperativeAssessment.objects.update_or_create(
        tenant=tenant,
        patient=patient,
        surgical_request=request,
        proposed_surgery=surgery,
        defaults={
            "evaluator": anesthetist,
            "medical_evaluation": "Paciente em bom estado geral, sem sinais de infeção ativa, tensão arterial controlada.",
            "anesthetic_evaluation": "Via aérea Mallampati II, jejum confirmado, sem antecedentes de reação anestésica.",
            "asa_class": PreoperativeAssessment.AsaClass.ASA_II,
            "surgical_risk": "Risco anestésico-cirúrgico baixo a moderado.",
            "required_exams": [
                {"exam": "Hemograma", "result": "Sem anemia, leucócitos normais"},
                {"exam": "Coagulograma", "result": "TP/TTPa dentro dos limites"},
                {"exam": "ECG", "result": "Ritmo sinusal sem alterações agudas"},
            ],
            "exam_results_reviewed": True,
            "fit_for_surgery": True,
            "consent_signed": True,
            "assessed_at": now - timedelta(hours=20),
            "status": PreoperativeAssessment.Status.FIT,
            "observations": "Liberada para anestesia geral. Manter profilaxia antibiótica na indução.",
        },
    )

    schedule, _ = SurgicalSchedule.objects.update_or_create(
        tenant=tenant,
        surgery=surgery,
        defaults={
            "operating_room": room,
            "primary_surgeon": surgeon,
            "anesthetist": anesthetist,
            "scheduled_start": start,
            "scheduled_end": end + timedelta(minutes=30),
            "status": SurgicalSchedule.Status.CONFIRMED,
            "priority": SurgicalSchedule.Priority.ELECTIVE,
            "authorization_verified": True,
            "patient_checked_in_at": start - timedelta(minutes=45),
            "notes": "Paciente admitida, sala e equipa confirmadas.",
        },
    )

    team_data = [
        (surgeon, SurgicalTeamMember.Role.MAIN_SURGEON, True, "Responsável pelo ato cirúrgico e assinatura do relatório."),
        (assistant, SurgicalTeamMember.Role.ASSISTANT_SURGEON, False, "Assistência laparoscópica e encerramento."),
        (anesthetist, SurgicalTeamMember.Role.ANESTHETIST, True, "Anestesia geral balanceada e analgesia pós-operatória."),
        (scrub_nurse, SurgicalTeamMember.Role.SCRUB_NURSE, False, "Instrumentação, contagem de compressas e materiais."),
        (recovery_nurse, SurgicalTeamMember.Role.RECOVERY_NURSE, False, "Receção em recuperação e vigilância pós-anestésica."),
    ]
    for employee, role, lead, responsibility in team_data:
        SurgicalTeamMember.objects.update_or_create(
            tenant=tenant,
            surgery=surgery,
            employee=employee,
            role=role,
            defaults={
                "lead": lead,
                "present": True,
                "entry_at": start,
                "exit_at": end if role != SurgicalTeamMember.Role.RECOVERY_NURSE else recovery_out,
                "responsibility": responsibility,
                "signed_at": end + timedelta(minutes=10),
                "signature_reference": f"SIG-{MARK}-{role}",
                "notes": "Presença confirmada no cenário completo.",
            },
        )

    category, _ = ProductCategory.objects.update_or_create(
        tenant=tenant,
        name="Materiais cirúrgicos seed",
        defaults={"description": "Produtos para cenário cirúrgico completo."},
    )
    products = []
    for code, name, ptype, price in [
        ("TELA-HERNIA-15X10", "Tela de polipropileno 15x10 cm", Product.ProductType.MATERIAL, "32000.00"),
        ("TROCART-10MM", "Trocart descartável 10 mm", Product.ProductType.MATERIAL, "8500.00"),
        ("SUT-VICRYL-2-0", "Sutura Vicryl 2-0", Product.ProductType.MATERIAL, "1500.00"),
        ("CEF-1G", "Cefazolina 1 g", Product.ProductType.MEDICAMENTO, "950.00"),
        ("PROP-200MG", "Propofol 200 mg", Product.ProductType.MEDICAMENTO, "1200.00"),
    ]:
        product, _ = Product.objects.update_or_create(
            tenant=tenant,
            name=name,
            defaults={
                "category": category,
                "type": ptype,
                "sale_price": money(price),
                "vat_percentage": money("5.00"),
                "applies_vat_by_default": True,
            },
        )
        products.append((code, product))

    materials = []
    for code, product in products[:3]:
        material, _ = SurgicalMaterial.objects.update_or_create(
            tenant=tenant,
            code=code,
            defaults={
                "name": product.name,
                "product": product,
                "material_type": SurgicalMaterial.MaterialType.IMPLANT if code.startswith("TELA") else SurgicalMaterial.MaterialType.CONSUMABLE,
                "unit": "un",
                "internal_code": f"INT-{code}",
                "cost_price": (product.sale_price * Decimal("0.70")).quantize(Decimal("0.01")),
                "sale_price": product.sale_price,
                "batch_number": f"LT-{MARK[-8:]}-{code[:4]}",
                "expiry_date": date.today() + timedelta(days=540),
                "implantable": code.startswith("TELA"),
                "sterilizable": False,
                "tracks_lot": True,
                "tracks_expiry": True,
                "reusable": False,
                "sterile": True,
                "active": True,
                "notes": "Material concreto usado no cenário cirúrgico completo.",
            },
        )
        materials.append(material)

    procedure_item, _ = SurgeryProcedureItem.objects.update_or_create(
        tenant=tenant,
        surgery=surgery,
        sequence=1,
        defaults={
            "procedure": procedure,
            "description": "Hernioplastia inguinal laparoscópica direita com tela",
            "anatomical_region": "Região inguinal direita",
            "laterality": SurgeryProcedureItem.Laterality.RIGHT,
            "responsible_surgeon": surgeon,
            "status": SurgeryProcedureItem.Status.COMPLETED,
            "quantity": money("1.00"),
            "unit_price": procedure.base_price,
            "vat_percentage": procedure.vat_percentage,
            "applies_vat": True,
            "started_at": incision,
            "ended_at": end,
            "notes": "Procedimento concluído e pronto para faturação.",
        },
    )

    consumptions = []
    for material, qty in [(materials[0], "1.00"), (materials[1], "2.00"), (materials[2], "1.00")]:
        consumption, _ = SurgicalConsumption.objects.update_or_create(
            tenant=tenant,
            surgery=surgery,
            material=material,
            defaults={
                "product": material.product,
                "consumed_by": scrub_nurse,
                "quantity": money(qty),
                "unit_cost": material.cost_price,
                "charged_price": material.sale_price,
                "consumed_at": incision + timedelta(minutes=35),
                "batch_number": material.batch_number,
                "expiry_date": material.expiry_date,
                "material_status": SurgicalConsumption.MaterialFlowStatus.BILLED,
                "billing_status": SurgicalConsumption.BillingStatus.BILLED,
                "inventory_deducted": True,
                "returned_quantity": money("0.00"),
                "notes": "Consumo real de sala associado à autorização e faturação.",
            },
        )
        consumptions.append(consumption)

    anesthesia, _ = AnesthesiaRecord.objects.update_or_create(
        tenant=tenant,
        surgery=surgery,
        defaults={
            "anesthetist": anesthetist,
            "anesthesia_type": AnesthesiaRecord.AnesthesiaType.GENERAL,
            "asa_class": "ASA_II",
            "status": AnesthesiaRecord.Status.COMPLETED,
            "induction_at": induction,
            "started_at": induction,
            "ended_at": end,
            "airway_management": "Intubação orotraqueal sem dificuldade.",
            "medications": [
                {"medicamento": "Cefazolina 1 g", "via": "EV", "momento": "Indução"},
                {"medicamento": "Propofol 200 mg", "via": "EV", "momento": "Indução"},
                {"medicamento": "Fentanil 100 mcg", "via": "EV", "momento": "Analgesia intraoperatória"},
            ],
            "fluids": [{"fluido": "Ringer lactato", "volume_ml": 1000}],
            "vital_signs": [
                {"hora": "08:45", "ta": "128/78", "fc": 82, "spo2": 99},
                {"hora": "09:30", "ta": "118/72", "fc": 76, "spo2": 100},
                {"hora": "10:40", "ta": "122/76", "fc": 78, "spo2": 99},
            ],
            "adverse_events": [],
            "recovery_handoff": "Paciente entregue acordando, ventilação espontânea, dor controlada.",
            "complications": "Sem complicações anestésicas.",
            "notes": "Registo anestésico completo para cenário de teste.",
        },
    )

    for phase in [
        SurgicalSafetyChecklist.Phase.SIGN_IN,
        SurgicalSafetyChecklist.Phase.TIME_OUT,
        SurgicalSafetyChecklist.Phase.SIGN_OUT,
    ]:
        SurgicalSafetyChecklist.objects.update_or_create(
            tenant=tenant,
            surgery=surgery,
            phase=phase,
            defaults={
                "completed_by": scrub_nurse,
                "status": SurgicalSafetyChecklist.Status.COMPLETED,
                "patient_identity_confirmed": True,
                "procedure_confirmed": True,
                "site_marked": True,
                "consent_confirmed": True,
                "anesthesia_safety_checked": True,
                "antibiotic_prophylaxis": True,
                "instrument_count_confirmed": True,
                "specimens_labeled": True,
                "completed_at": start + timedelta(minutes=5),
                "notes": f"Checklist {phase} completo.",
            },
        )

    report, _ = OperativeReport.objects.update_or_create(
        tenant=tenant,
        surgery=surgery,
        defaults={
            "primary_surgeon": surgeon,
            "status": OperativeReport.Status.FINAL,
            "preoperative_diagnosis": surgery.preoperative_diagnosis,
            "postoperative_diagnosis": surgery.postoperative_diagnosis,
            "procedure_performed": "Hernioplastia inguinal laparoscópica direita com colocação de tela.",
            "findings": "Defeito indireto direito, saco herniário reduzido, sem necrose ou encarceramento.",
            "technique": "Acesso laparoscópico, dissecção pré-peritoneal, colocação e fixação de tela, encerramento por planos.",
            "complications": "Sem intercorrências.",
            "estimated_blood_loss_ml": 40,
            "specimens": "Sem peça cirúrgica enviada.",
            "drains": "Sem drenos.",
            "implants": "Tela de polipropileno 15x10 cm.",
            "final_patient_condition": "Estável, encaminhada para recuperação pós-anestésica.",
            "postoperative_plan": "Analgesia, dieta leve após despertar, vigilância de ferida operatória e alta conforme Aldrete.",
            "specimen_sent_to_pathology": False,
            "started_at": incision,
            "ended_at": end,
            "signed_at": end + timedelta(minutes=25),
            "digitally_signed": True,
            "digital_signature_reference": f"DSIG-{MARK}",
            "notes": "Relatório final assinado.",
        },
    )

    recovery, _ = RecoveryRecord.objects.update_or_create(
        tenant=tenant,
        surgery=surgery,
        defaults={
            "nurse": recovery_nurse,
            "admitted_at": recovery_in,
            "discharged_at": recovery_out,
            "status": RecoveryRecord.Status.DISCHARGED,
            "consciousness_level": "Acordada, orientada, responde a comandos.",
            "pain_score": 2,
            "aldrete_score": 10,
            "vital_signs": {"ta": "124/78", "fc": 80, "spo2": 98, "temp": 36.6, "fr": 16},
            "nausea_vomiting": False,
            "bleeding": False,
            "complications": "Sem complicações na recuperação.",
            "destination": "Alta para domicílio com acompanhante.",
            "notes": "Alta após critérios clínicos cumpridos.",
        },
    )

    authorization, _ = SurgicalAuthorization.objects.update_or_create(
        tenant=tenant,
        patient=patient,
        surgery=surgery,
        defaults={
            "surgical_request": request,
            "preoperative_assessment": assessment,
            "status": SurgicalAuthorization.Status.APPROVED,
            "quotation_amount": money("132500.00"),
            "approved_amount": money("125000.00"),
            "initial_payment_amount": money("25000.00"),
            "budget_approved": True,
            "initial_payment_received": True,
            "insurance_authorized": True,
            "special_materials_approved": True,
            "room_available": True,
            "team_available": True,
            "preoperative_assessment_completed": True,
            "consent_signed": True,
            "valid_until": date.today() + timedelta(days=30),
            "approved_at": now - timedelta(hours=6),
            "rejected_reason": "",
            "notes": "Autorização completa com cobertura parcial por seguro e pagamento inicial confirmado.",
        },
    )

    invoice, _ = Invoice.objects.update_or_create(
        tenant=tenant,
        surgery=surgery,
        defaults={
            "origin": Invoice.Origin.SURGERY,
            "patient": patient,
            "fiscal_client_name": patient.name,
            "fiscal_client_nuit": "400123456",
            "fiscal_client_address": patient.address,
            "insurance_amount": money("100000.00"),
            "status": Invoice.Status.DRAFT,
            "verification_hash": f"VH-{MARK}",
        },
    )
    if invoice.status != Invoice.Status.DRAFT:
        invoice.status = Invoice.Status.DRAFT
        invoice.save(update_fields=["status"])

    InvoiceItem.objects.filter(invoice=invoice, description__startswith=f"{MARK} ").delete()
    invoice_items = [
        ("Procedimento cirúrgico", procedure_item.quantity, procedure_item.unit_price),
        ("Taxa de sala operatória", money("1.00"), money("18000.00")),
        ("Honorários da equipa cirúrgica", money("1.00"), money("22000.00")),
        ("Anestesia geral", money("1.00"), money("14000.00")),
        ("Recuperação pós-anestésica", money("1.00"), money("6500.00")),
    ]
    for label, qty, unit_price in invoice_items:
        InvoiceItem.objects.create(
            tenant=tenant,
            invoice=invoice,
            item_type=InvoiceItem.ItemType.AJUSTE,
            description=f"{MARK} {label}",
            quantity=qty,
            unit_price=unit_price,
            applies_vat=True,
            vat_percentage=money("5.00"),
        )
    for consumption in consumptions:
        InvoiceItem.objects.create(
            tenant=tenant,
            invoice=invoice,
            item_type=InvoiceItem.ItemType.ITEM_VENDA,
            product=consumption.product,
            description=f"{MARK} {consumption.product.name if consumption.product else consumption.material.name}",
            quantity=consumption.quantity,
            unit_price=consumption.charged_price,
            applies_vat=True,
            vat_percentage=money("5.00"),
        )
    invoice.persist_totals()
    invoice.status = Invoice.Status.ISSUED
    invoice.save(update_fields=["status"])

    SurgicalBillingItem.objects.filter(surgery=surgery).delete()
    SurgicalBillingItem.objects.create(
        tenant=tenant,
        surgery=surgery,
        authorization=authorization,
        procedure_item=procedure_item,
        invoice=invoice,
        event_type=SurgicalBillingItem.EventType.SURGICAL_PROCEDURE,
        billing_mode=SurgicalBillingItem.BillingMode.HYBRID,
        description="Hernioplastia inguinal laparoscópica direita",
        quantity=money("1.00"),
        unit_price=procedure_item.unit_price,
        vat_percentage=money("5.00"),
        applies_vat=True,
        billable=True,
        status=SurgicalBillingItem.Status.INVOICED,
        billed_at=now,
        notes="Faturado na fatura cirúrgica do cenário completo.",
    )
    for consumption in consumptions:
        SurgicalBillingItem.objects.create(
            tenant=tenant,
            surgery=surgery,
            authorization=authorization,
            consumption=consumption,
            invoice=invoice,
            event_type=SurgicalBillingItem.EventType.SURGICAL_MATERIAL,
            billing_mode=SurgicalBillingItem.BillingMode.ITEMIZED,
            description=consumption.product.name if consumption.product else consumption.material.name,
            quantity=consumption.quantity,
            unit_price=consumption.charged_price,
            vat_percentage=money("5.00"),
            applies_vat=True,
            billable=True,
            status=SurgicalBillingItem.Status.INVOICED,
            billed_at=now,
            notes="Material faturado a partir de consumo real de sala.",
        )

    documents = [
        ("Consentimento cirúrgico assinado", SurgicalDocument.DocumentType.CONSENT, assessment),
        ("Orçamento cirúrgico aprovado", SurgicalDocument.DocumentType.QUOTATION, None),
        ("Autorização do seguro", SurgicalDocument.DocumentType.INSURANCE, None),
        ("Relatório operatório final", SurgicalDocument.DocumentType.OPERATIVE_REPORT, None),
        ("Alta pós-anestésica", SurgicalDocument.DocumentType.DISCHARGE, None),
    ]
    for title, doc_type, assessment_link in documents:
        SurgicalDocument.objects.update_or_create(
            tenant=tenant,
            surgery=surgery,
            authorization=authorization,
            title=title,
            defaults={
                "surgical_request": request,
                "preoperative_assessment": assessment_link or assessment,
                "uploaded_by": scrub_nurse,
                "document_type": doc_type,
                "status": SurgicalDocument.Status.SIGNED,
                "external_reference": f"DOC-{MARK}-{doc_type}",
                "signed_at": now - timedelta(hours=5),
                "expires_at": now + timedelta(days=180),
                "notes": "Documento concreto do cenário cirúrgico completo.",
            },
        )

    SurgicalSpecimen.objects.update_or_create(
        tenant=tenant,
        surgery=surgery,
        patient=patient,
        specimen_type="Sem amostra histológica",
        defaults={
            "anatomical_site": "Região inguinal direita",
            "collected_at": end,
            "fixative": "Não aplicável",
            "responsible": surgeon,
            "status": SurgicalSpecimen.Status.CANCELLED,
            "notes": "Procedimento sem peça para patologia; registo incluído para rastreabilidade.",
        },
    )

    events = [
        (SurgicalAuditEvent.EventType.CLINICAL, "Pedido cirúrgico aprovado", "", request.status),
        (SurgicalAuditEvent.EventType.AUTHORIZATION, "Autorização financeira aprovada", "PENDING", authorization.status),
        (SurgicalAuditEvent.EventType.ROOM, "Sala e equipa confirmadas", "REQUESTED", schedule.status),
        (SurgicalAuditEvent.EventType.MATERIAL, "Materiais preparados e consumidos", "PREPARED", "BILLED"),
        (SurgicalAuditEvent.EventType.BILLING, "Faturação cirúrgica emitida", "READY", "INVOICED"),
    ]
    for event_type, action, previous, new in events:
        SurgicalAuditEvent.objects.update_or_create(
            tenant=tenant,
            surgery=surgery,
            surgical_request=request,
            action=action,
            defaults={
                "actor": scrub_nurse if event_type == SurgicalAuditEvent.EventType.MATERIAL else surgeon,
                "event_type": event_type,
                "previous_state": previous,
                "new_state": new,
                "metadata": {
                    "seed": MARK,
                    "authorization_id": authorization.id,
                    "invoice_id": invoice.id,
                    "recovery_id": recovery.id,
                    "report_id": report.id,
                    "anesthesia_id": anesthesia.id,
                },
                "occurred_at": now,
                "notes": "Evento gerado para validação de contexto completo.",
            },
        )

    request.status = SurgicalRequest.Status.CONVERTED
    request.converted_at = now
    request.save(update_fields=["status", "converted_at"])

    return {
        "tenant": tenant.id,
        "patient": patient.id,
        "request": request.id,
        "surgery": surgery.id,
        "assessment": assessment.id,
        "authorization": authorization.id,
        "invoice": invoice.id,
        "invoice_total": str(invoice.total),
        "consumptions": [item.id for item in consumptions],
    }


if __name__ == "__main__":
    print(run())
