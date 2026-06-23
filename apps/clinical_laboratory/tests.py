"""Smoke tests do Laboratório Clínico (LIS) — fluxo completo + isolamento."""

from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.db import IntegrityError
from django.utils import timezone
import pytest

from apps.clinical_laboratory.models import (
    CorrectiveAction,
    ExposureIncident,
    LabRiskAssessment,
    Nonconformity,
    PPEItem,
    QualityDocument,
)

from apps.clinical.models.patient import Patient
from apps.clinical_laboratory.catalog import seed_catalog
from apps.clinical_laboratory.models import (
    AcidFastSmear,
    AntibioticSusceptibility,
    LabOrder,
    LabOrderItem,
    LabReport,
    LabResult,
    LabSample,
    LabSector,
    LabTest,
    MicrobiologyCulture,
    MicrobiologyIsolate,
    MolecularResult,
    ResultValidation,
    SampleCollection,
    SampleReception,
)
from apps.tenants.models.tenant import Tenant
from api.v1.clinical_laboratory.serializers import LabSampleSerializer


def _tenant(slug="lab-t"):
    return Tenant.objects.create(identifier=slug, name=slug.upper())


@pytest.mark.django_db
def test_fluxo_completo_pre_analitico_ate_laudo():
    t = _tenant()
    patient = Patient.objects.create(tenant=t, name="João Paciente")
    sector = LabSector.objects.create(tenant=t, name="Bioquímica", code="BIO")
    test = LabTest.objects.create(tenant=t, name="Glicose", code="GLI", sector=sector,
                                  price=Decimal("150.00"))

    # Pedido + item
    order = LabOrder.objects.create(tenant=t, patient=patient)
    item = LabOrderItem.objects.create(tenant=t, order=order, test=test, price=test.price)

    # Eletivo só colhe depois de autorizado
    assert order.can_collect() is False
    order.authorize()
    assert order.can_collect() is True

    # Colheita → amostra → recepção (pré-analítico)
    collection = SampleCollection.objects.create(tenant=t, order=order, patient=patient)
    collection.mark_collected()
    assert collection.status == SampleCollection.Status.COLLECTED

    sample = LabSample.objects.create(tenant=t, order=order, collection=collection, barcode="BC-001")
    sample.receive()
    sample.accept()
    assert sample.status == LabSample.Status.ACCEPTED
    SampleReception.objects.create(tenant=t, sample=sample, accepted=True)

    # Resultado + validação clínica (analítico)
    result = LabResult.objects.create(tenant=t, order_item=item, sample=sample)
    result.enter_result(value="95")
    assert result.status == LabResult.Status.ENTERED

    validation = ResultValidation.objects.create(
        tenant=t, result=result, validation_type=ResultValidation.ValidationType.CLINICAL)
    validation.approve()
    result.refresh_from_db()
    assert result.status == LabResult.Status.VALIDATED  # validação clínica liberta o resultado

    # Laudo (pós-analítico)
    report = LabReport.objects.create(tenant=t, order=order, patient=patient)
    report.sign()
    report.deliver(channel="portal")
    assert report.status == LabReport.Status.DELIVERED
    assert report.report_number  # número gerado na assinatura

    # Rastreabilidade: custom_ids por prefixo
    assert (order.custom_id or "").startswith("LORD")
    assert (sample.custom_id or "").startswith("LSAM")
    assert (report.custom_id or "").startswith("LREP")


@pytest.mark.django_db
def test_urgente_pode_colher_sem_pagamento():
    t = _tenant("lab-urg")
    patient = Patient.objects.create(tenant=t, name="Maria Urgente")
    order = LabOrder.objects.create(tenant=t, patient=patient, priority=LabOrder._meta.get_field("priority").default)
    order.priority = "STAT"
    order.save(update_fields=["priority"])
    assert order.can_collect() is True  # STAT colhe antes do pagamento


@pytest.mark.django_db
def test_barcode_de_amostra_unico_por_tenant():
    t = _tenant("lab-bc")
    patient = Patient.objects.create(tenant=t, name="Ana")
    order = LabOrder.objects.create(tenant=t, patient=patient)
    LabSample.objects.create(tenant=t, order=order, barcode="DUP-1")
    with pytest.raises(IntegrityError):
        LabSample.objects.create(tenant=t, order=order, barcode="DUP-1")


@pytest.mark.django_db
def test_lab_sample_serializer_expoe_contexto_humano_para_pagina_operacional():
    t = _tenant("lab-sample-ui")
    patient = Patient.objects.create(tenant=t, name="Ana Silva", gender="F", birth_date=timezone.localdate() - timedelta(days=365 * 31))
    order = LabOrder.objects.create(tenant=t, patient=patient)
    sample = LabSample.objects.create(
        tenant=t,
        order=order,
        barcode="UI-001",
        sample_type="SORO",
        container_type="Tubo amarelo",
        condition=LabSample.Condition.ADEQUATE,
        status=LabSample.Status.RECEIVED,
    )

    data = LabSampleSerializer(sample).data

    assert data["order_custom_id"] == order.custom_id
    assert data["patient_name"] == "Ana Silva"
    assert data["patient_gender"] == patient.gender
    assert data["patient_age"] == "31 anos"
    assert data["sample_type_display"] == "Soro"
    assert data["status_display"] == "Recebida"
    assert data["condition_display"] == "Adequada"


@pytest.mark.django_db
def test_sample_collection_serializer_expoe_contexto_humano_para_pagina_operacional():
    from api.v1.clinical_laboratory.serializers import SampleCollectionSerializer

    t = _tenant("lab-collection-ui")
    patient = Patient.objects.create(tenant=t, name="Bruno Costa", gender="M", birth_date=timezone.localdate() - timedelta(days=365 * 40))
    order = LabOrder.objects.create(tenant=t, patient=patient)
    collection = SampleCollection.objects.create(
        tenant=t,
        order=order,
        patient=patient,
        sample_type="SORO",
        container_type="Tubo vermelho",
        location="Sala 2",
        status=SampleCollection.Status.COLLECTED,
    )

    data = SampleCollectionSerializer(collection).data

    assert data["order_custom_id"] == order.custom_id
    assert data["patient_name"] == "Bruno Costa"
    assert data["patient_gender"] == patient.gender
    assert data["patient_age"] == "40 anos"
    assert data["sample_type_display"] == "Soro"
    assert data["status_display"] == "Colhida"


@pytest.mark.django_db
def test_sample_collection_transicoes_de_estado():
    t = _tenant("lab-collection-flow")
    patient = Patient.objects.create(tenant=t, name="Carla Dias")
    order = LabOrder.objects.create(tenant=t, patient=patient)
    collection = SampleCollection.objects.create(tenant=t, order=order, patient=patient)

    assert collection.status == SampleCollection.Status.PENDING

    collection.mark_collected()
    assert collection.status == SampleCollection.Status.COLLECTED
    assert collection.collection_at is not None

    collection.send_to_lab()
    assert collection.status == SampleCollection.Status.SENT

    collection.mark_failed()
    assert collection.status == SampleCollection.Status.FAILED


# --- sectores especializados ---
@pytest.mark.django_db
def test_microbiologia_cultura_isolado_antibiograma():
    t = _tenant("lab-mic")
    patient = Patient.objects.create(tenant=t, name="P")
    sector = LabSector.objects.create(tenant=t, name="Microbiologia", code="MIC")
    test = LabTest.objects.create(tenant=t, name="Urocultura", code="UROC", sector=sector)
    order = LabOrder.objects.create(tenant=t, patient=patient)
    item = LabOrderItem.objects.create(tenant=t, order=order, test=test)
    sample = LabSample.objects.create(tenant=t, order=order, barcode="MIC-1")

    culture = MicrobiologyCulture.objects.create(
        tenant=t, order_item=item, sample=sample,
        culture_type=MicrobiologyCulture.CultureType.URINE)
    isolate = MicrobiologyIsolate.objects.create(tenant=t, culture=culture, organism_name="E. coli")
    AntibioticSusceptibility.objects.create(
        tenant=t, isolate=isolate, antibiotic="Ciprofloxacina",
        result=AntibioticSusceptibility.Result.RESISTANT, zone_mm=12)

    assert culture.isolates.count() == 1
    assert isolate.susceptibilities.first().result == AntibioticSusceptibility.Result.RESISTANT
    assert (culture.custom_id or "").startswith("LCUL")


@pytest.mark.django_db
def test_genexpert_mtb_rif_detetado_resistente():
    t = _tenant("lab-mol")
    patient = Patient.objects.create(tenant=t, name="P")
    sector = LabSector.objects.create(tenant=t, name="Biologia Molecular", code="MOL")
    test = LabTest.objects.create(tenant=t, name="GeneXpert MTB/RIF", code="GENEXP", sector=sector)
    order = LabOrder.objects.create(tenant=t, patient=patient)
    item = LabOrderItem.objects.create(tenant=t, order=order, test=test)

    mol = MolecularResult.objects.create(
        tenant=t, order_item=item,
        assay=MolecularResult.Assay.GENEXPERT_MTB_RIF,
        detection=MolecularResult.Detection.DETECTED,
        rif_resistance=MolecularResult.RifResistance.RESISTANT)

    assert "GeneXpert" in str(mol)
    assert "Resistente" in str(mol)  # resistência à rifampicina no __str__


@pytest.mark.django_db
def test_baciloscopia_positiva_2cruzes():
    t = _tenant("lab-bac")
    patient = Patient.objects.create(tenant=t, name="P")
    sector = LabSector.objects.create(tenant=t, name="Baciloscopia", code="BAC")
    test = LabTest.objects.create(tenant=t, name="BAAR", code="BAAR", sector=sector)
    order = LabOrder.objects.create(tenant=t, patient=patient)
    item = LabOrderItem.objects.create(tenant=t, order=order, test=test)

    afb = AcidFastSmear.objects.create(tenant=t, order_item=item, grade=AcidFastSmear.Grade.TWO_PLUS)
    assert afb.is_positive is True


@pytest.mark.django_db
def test_seed_catalogo_idempotente_com_genexpert_e_baar():
    t = _tenant("lab-seed")
    stats = seed_catalog(t)
    assert stats["sectors"] == 12
    assert stats["tests"] >= 30
    assert stats["panels"] == 6
    # exames-chave existem
    assert LabTest.objects.filter(tenant=t, code="GENEXP").exists()  # GeneXpert MTB/RIF
    assert LabTest.objects.filter(tenant=t, code="BAAR").exists()    # Baciloscopia
    # idempotência: segunda execução não duplica
    assert seed_catalog(t)["sectors"] == 0


# --- Gestão da Qualidade + Biossegurança ---
@pytest.mark.django_db
def test_nao_conformidade_para_capa_e_overdue():
    t = _tenant("lab-nc")
    nc = Nonconformity.objects.create(
        tenant=t, description="Amostra sem identificação", severity=Nonconformity.Severity.MAJOR)
    action = CorrectiveAction.objects.create(
        tenant=t, nonconformity=nc, description="Reforçar dupla identificação",
        due_date=timezone.localdate() - timedelta(days=1))

    assert nc.actions.count() == 1
    assert action.is_overdue() is True
    action.status = CorrectiveAction.Status.VERIFIED
    action.save(update_fields=["status"])
    assert action.is_overdue() is False
    assert (nc.custom_id or "").startswith("QNC")


@pytest.mark.django_db
def test_risco_calcula_nivel_no_save():
    t = _tenant("lab-rk")
    critico = LabRiskAssessment.objects.create(
        tenant=t, description="Troca de amostras",
        category=LabRiskAssessment.Category.QUALITY, likelihood=5, impact=5)
    baixo = LabRiskAssessment.objects.create(
        tenant=t, description="Atraso menor", likelihood=1, impact=2)
    assert critico.level == LabRiskAssessment.Level.CRITICAL
    assert baixo.level == LabRiskAssessment.Level.LOW


@pytest.mark.django_db
def test_documento_qualidade_aprovacao():
    t = _tenant("lab-doc")
    doc = QualityDocument.objects.create(
        tenant=t, code="SOP-001", title="SOP de colheita",
        document_type=QualityDocument.DocType.SOP)
    doc.approve()
    assert doc.status == QualityDocument.Status.APPROVED
    assert doc.approved_at is not None


@pytest.mark.django_db
def test_epi_abaixo_do_minimo():
    t = _tenant("lab-epi")
    luvas = PPEItem.objects.create(tenant=t, name="Luvas nitrilo", minimum_stock=100, current_stock=20)
    assert luvas.is_below_minimum is True


@pytest.mark.django_db
def test_exposicao_ligada_a_nao_conformidade():
    t = _tenant("lab-exp")
    User = get_user_model()
    user = User(username="tec@lab.mz", email="tec@lab.mz", tenant=t)
    user.set_password("x")
    user.save()

    nc = Nonconformity.objects.create(
        tenant=t, description="Picada de agulha", source=Nonconformity.Source.EXPOSURE)
    exposure = ExposureIncident.objects.create(
        tenant=t, staff=user, exposure_type=ExposureIncident.ExposureType.NEEDLESTICK,
        nonconformity=nc)

    assert exposure.nonconformity_id == nc.id
    assert (exposure.custom_id or "").startswith("BEXP")
