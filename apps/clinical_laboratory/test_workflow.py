from __future__ import annotations

import pytest

from decimal import Decimal

from django.core.exceptions import ValidationError

from apps.clinical_laboratory.models import (
    CriticalResultNotification,
    LabOrder,
    LabOrderItem,
    LabReport,
    LabResult,
    LabSector,
    LabTest,
    LabTestField,
    LabTestPanel,
)
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


def _critical_setup(identifier, *, test_kwargs=None):
    tenant = Tenant.objects.create(identifier=identifier, name=identifier.upper())
    patient = Patient.objects.create(tenant=tenant, name="João")
    sector = LabSector.objects.create(tenant=tenant, name="Bioquímica", code="BIO")
    test = LabTest.objects.create(tenant=tenant, name="Potássio", code="K", sector=sector,
                                  **(test_kwargs or {}))
    order = LabOrder.objects.create(tenant=tenant, patient=patient)
    item = LabOrderItem.objects.create(tenant=tenant, order=order, test=test)
    return tenant, patient, sector, test, order, item


@pytest.mark.django_db
def test_critical_value_autoflags_and_surfaces_to_page():
    # Limiares no próprio exame (valor único): valor acima do crítico → flag
    # CRITICO_ALTO e criação automática da notificação crítica ligada à requisição.
    tenant, patient, sector, test, order, item = _critical_setup(
        "lab-crit-1", test_kwargs={"critical_high": Decimal("6.0"), "reference_high": Decimal("5.0")})
    result = LabResult.objects.create(tenant=tenant, order_item=item)

    result.enter_result(value="7.2")
    assert result.flag == LabResult.Flag.CRITICAL_HIGH

    notifs = CriticalResultNotification.objects.filter(result=result)
    assert notifs.count() == 1
    notif = notifs.first()
    assert notif.order_id == order.id  # a requisição está disponível na página
    assert notif.patient_id == patient.id
    assert notif.readback_confirmed is False  # pendente, aguarda comunicação


@pytest.mark.django_db
def test_field_thresholds_take_precedence_over_test():
    # Os limiares do campo (ExameCampo) têm prioridade sobre os do exame.
    tenant, patient, sector, test, order, item = _critical_setup(
        "lab-crit-2", test_kwargs={"critical_low": Decimal("2.0")})
    field = LabTestField.objects.create(tenant=tenant, test=test, name="Potássio sérico",
                                        critical_low=Decimal("3.0"))
    result = LabResult.objects.create(tenant=tenant, order_item=item, test_field=field)

    # 2.5 não é crítico pelo exame (<2.0) mas é pelo campo (<3.0).
    result.enter_result(value="2.5")
    assert result.flag == LabResult.Flag.CRITICAL_LOW
    assert CriticalResultNotification.objects.filter(result=result).count() == 1


@pytest.mark.django_db
def test_critical_notification_is_idempotent():
    tenant, patient, sector, test, order, item = _critical_setup(
        "lab-crit-3", test_kwargs={"critical_high": Decimal("6.0")})
    result = LabResult.objects.create(tenant=tenant, order_item=item)

    result.enter_result(value="9.0")
    result.enter_result(value="8.0")  # ainda crítico; segunda gravação
    result.mark_validated()  # outra gravação do mesmo resultado
    assert CriticalResultNotification.objects.filter(result=result).count() == 1


@pytest.mark.django_db
def test_normal_value_does_not_surface():
    tenant, patient, sector, test, order, item = _critical_setup(
        "lab-crit-4", test_kwargs={"reference_low": Decimal("3.5"), "reference_high": Decimal("5.0"),
                                   "critical_high": Decimal("6.0")})
    result = LabResult.objects.create(tenant=tenant, order_item=item)

    result.enter_result(value="4.2")
    assert result.flag == LabResult.Flag.NORMAL
    assert CriticalResultNotification.objects.filter(result=result).count() == 0


@pytest.mark.django_db
def test_direct_save_of_critical_numeric_value_surfaces():
    # Mesmo sem passar por enter_result (ex.: edição direta via API), um valor
    # numérico crítico é detetado pelo sinal pre_save.
    tenant, patient, sector, test, order, item = _critical_setup(
        "lab-crit-5", test_kwargs={"critical_low": Decimal("3.0")})
    result = LabResult.objects.create(tenant=tenant, order_item=item,
                                      numeric_value=Decimal("2.1"), value="2.1")
    assert result.flag == LabResult.Flag.CRITICAL_LOW
    assert CriticalResultNotification.objects.filter(result=result).count() == 1


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
