from __future__ import annotations

import pytest

from apps.clinical_laboratory.models import LabOrder, LabReport
from apps.clinical.models.patient import Patient
from apps.tenants.models.tenant import Tenant
from api.v1.clinical_laboratory.viewsets import (
    LabOrderViewSet,
    LabReportViewSet,
    LabResultViewSet,
    LabSampleViewSet,
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
