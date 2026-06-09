from __future__ import annotations

import pytest

from decimal import Decimal

from django.core.exceptions import ValidationError

from apps.clinical_laboratory.models import LabOrder, LabReport, LabSector, LabTest, LabTestPanel
from apps.clinical_laboratory.models_quality import CorrectiveAction
from apps.clinical.models.patient import Patient
from apps.tenants.models.tenant import Tenant
from api.v1.clinical_laboratory.viewsets import (
    CorrectiveActionViewSet,
    LabOrderViewSet,
    LabReportViewSet,
    LabResultViewSet,
    LabSampleViewSet,
    LabTestPanelViewSet,
    LabTestViewSet,
    NonconformityViewSet,
    QualityDocumentViewSet,
    ResultValidationViewSet,
)


def _action_paths(viewset_cls):
    return {extra.url_path for extra in viewset_cls.get_extra_actions()}


def test_lab_workflow_actions_are_wired():
    # As acções de workflow expõem os métodos de domínio já existentes (§39.41).
    assert {"autorizar", "cancelar"} <= _action_paths(LabOrderViewSet)
    assert {"receber", "aceitar", "rejeitar"} <= _action_paths(LabSampleViewSet)
    assert {"inserir-resultado", "validar"} <= _action_paths(LabResultViewSet)
    assert {"aprovar"} <= _action_paths(ResultValidationViewSet)
    assert {"assinar", "entregar"} <= _action_paths(LabReportViewSet)


def test_quality_capa_actions_are_wired():
    # Ciclo de qualidade/CAPA (§40.25): documento, não-conformidade e ação corretiva.
    assert {"aprovar"} <= _action_paths(QualityDocumentViewSet)
    assert {"encerrar"} <= _action_paths(NonconformityViewSet)
    assert {"concluir", "verificar", "fechar"} <= _action_paths(CorrectiveActionViewSet)


def test_lab_catalog_activation_actions_are_wired():
    # Catálogo de serviços/exames (§41.6/§41.23): ativar/inativar.
    assert {"ativar", "inativar"} <= _action_paths(LabTestViewSet)
    assert {"ativar", "inativar"} <= _action_paths(LabTestPanelViewSet)


@pytest.mark.django_db
def test_lab_catalog_activate_deactivate():
    tenant = Tenant.objects.create(identifier="lab-cat", name="LAB-CAT")
    sector = LabSector.objects.create(tenant=tenant, name="Bioquímica", code="BIO")
    test = LabTest.objects.create(tenant=tenant, name="Glicose", code="GLI", sector=sector,
                                  price=Decimal("150.00"))
    panel = LabTestPanel.objects.create(tenant=tenant, name="Perfil lipídico", code="LIP")

    assert test.active is True
    test.deactivate()
    test.refresh_from_db()
    assert test.active is False
    test.activate()
    test.refresh_from_db()
    assert test.active is True

    panel.deactivate()
    panel.refresh_from_db()
    assert panel.active is False


@pytest.mark.django_db
def test_corrective_action_capa_cycle():
    tenant = Tenant.objects.create(identifier="lab-capa", name="LAB-CAPA")
    capa = CorrectiveAction.objects.create(tenant=tenant, description="Recalibrar centrífuga")
    assert capa.status == CorrectiveAction.Status.PLANNED

    # Não se verifica antes de concluir.
    with pytest.raises(ValidationError):
        capa.verify()

    capa.complete()
    assert capa.status == CorrectiveAction.Status.COMPLETED
    assert capa.completion_date is not None

    capa.verify(effective=True, notes="Eficaz")
    assert capa.status == CorrectiveAction.Status.VERIFIED
    assert capa.effectiveness_check == "Eficaz"

    capa.close()
    assert capa.status == CorrectiveAction.Status.CLOSED


@pytest.mark.django_db
def test_corrective_action_ineffective_branch():
    tenant = Tenant.objects.create(identifier="lab-capa2", name="LAB-CAPA2")
    capa = CorrectiveAction.objects.create(tenant=tenant, description="Trocar peça")
    capa.complete()
    capa.verify(effective=False)
    assert capa.status == CorrectiveAction.Status.INEFFECTIVE


@pytest.mark.django_db
def test_report_sign_then_deliver():
    tenant = Tenant.objects.create(identifier="lab-rep", name="LAB-REP")
    patient = Patient.objects.create(tenant=tenant, name="Maria")
    order = LabOrder.objects.create(tenant=tenant, patient=patient)
    report = LabReport.objects.create(tenant=tenant, order=order, patient=patient)

    report.sign()
    assert report.status == LabReport.Status.SIGNED
    assert report.report_number  # gerado na assinatura
    assert report.issued_at is not None

    report.deliver(channel="PRONTUARIO")
    assert report.status == LabReport.Status.DELIVERED
    assert report.delivered_at is not None
    assert report.delivery_channel == "PRONTUARIO"
