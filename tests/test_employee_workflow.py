"""Fluxos de RH do funcionário: disciplinar, promoção, aumento, revisão, desligamentos."""

from datetime import date
from decimal import Decimal

import pytest
from django.core.exceptions import ValidationError

from apps.human_resources.models.disciplinary_process import DisciplinaryProcess
from apps.human_resources.models.employee import Employee
from apps.human_resources.models.job_title import JobTitle
from apps.human_resources.models.salary_history import SalaryHistory
from apps.human_resources.models.termination import Termination
from apps.human_resources.services.employee_workflow import EmployeeWorkflowService
from apps.tenants.models.tenant import Tenant


def _tenant():
    return Tenant.objects.create(identifier="tn-rh", name="Tenant RH")


def _employee(tenant, **extra):
    defaults = dict(
        tenant=tenant,
        name="Hipolito Cano",
        admission_date=date(2018, 6, 6),
        status=Employee.Status.ACTIVE,
        nominal_salary=Decimal("65256.00"),
        minimum_progression_months=24,
        minimum_career_change_months=48,
    )
    defaults.update(extra)
    return Employee.objects.create(**defaults)


@pytest.mark.django_db
def test_disciplinar_promocao_bloqueada_e_aumento():
    tenant = _tenant()
    emp = _employee(tenant)
    cargo = JobTitle.objects.create(tenant=tenant, name="Chefe de Clínica")

    # processo disciplinar exige descrição
    with pytest.raises(ValidationError):
        EmployeeWorkflowService.iniciar_processo_disciplinar(emp, description="")

    proc = EmployeeWorkflowService.iniciar_processo_disciplinar(
        emp, incident_type="Falta injustificada", severity="GRAVE", description="Ausência sem aviso."
    )
    assert proc.status == DisciplinaryProcess.Status.OPEN

    # com processo aberto: promoção e aumento bloqueados
    with pytest.raises(ValidationError):
        EmployeeWorkflowService.promover(emp, role=cargo)
    with pytest.raises(ValidationError):
        EmployeeWorkflowService.dar_aumento(emp, amount="1000")

    # encerra o processo sem sanção -> volta a poder
    proc.status = DisciplinaryProcess.Status.CLOSED
    proc.sanction = DisciplinaryProcess.Sanction.NO_SANCTION
    proc.save()

    EmployeeWorkflowService.dar_aumento(emp, amount="2000", reason="Mérito anual")
    emp.refresh_from_db()
    assert emp.salary_increase == Decimal("2000.00")
    assert SalaryHistory.objects.filter(employee=emp, is_current=True).exists()

    EmployeeWorkflowService.promover(emp, role=cargo, salary_increase="3000")
    emp.refresh_from_db()
    assert emp.role_id == cargo.id
    assert emp.salary_increase == Decimal("5000.00")


@pytest.mark.django_db
def test_revisao_salarial_reducao_exige_motivo():
    tenant = _tenant()
    emp = _employee(tenant)

    with pytest.raises(ValidationError):
        EmployeeWorkflowService.revisao_salarial(emp, nominal_salary="50000", reason="")

    EmployeeWorkflowService.revisao_salarial(emp, nominal_salary="50000", reason="Reestruturação salarial")
    emp.refresh_from_db()
    assert emp.nominal_salary == Decimal("50000.00")
    assert emp.salary_increase == Decimal("0.00")


@pytest.mark.django_db
def test_aposentar_demitir_expulsar():
    tenant = _tenant()
    emp = _employee(tenant)

    # expulsão sem processo disciplinar concluído com despedimento: bloqueada
    with pytest.raises(ValidationError):
        EmployeeWorkflowService.expulsar(emp, reason="Roubo")

    proc = EmployeeWorkflowService.iniciar_processo_disciplinar(emp, description="Furto comprovado", severity="GRAVISSIMA")
    proc.status = DisciplinaryProcess.Status.SANCTION_APPLIED
    proc.sanction = DisciplinaryProcess.Sanction.TERMINATION
    proc.save()

    EmployeeWorkflowService.expulsar(emp, reason="Furto comprovado")
    emp.refresh_from_db()
    assert emp.status == Employee.Status.TERMINATED
    assert Termination.objects.filter(employee=emp, type=Termination.Type.TERMINATION).exists()

    # já desligado: nada mais é permitido
    with pytest.raises(ValidationError):
        EmployeeWorkflowService.demitir(emp, reason="x")
    with pytest.raises(ValidationError):
        EmployeeWorkflowService.aposentar(emp)

    emp2 = _employee(tenant, name="Outro Funcionario")
    EmployeeWorkflowService.demitir(emp2, reason="Reestruturação")
    emp2.refresh_from_db()
    assert emp2.status == Employee.Status.TERMINATED
    assert Termination.objects.filter(employee=emp2, type=Termination.Type.DISMISSAL).exists()

    emp3 = _employee(tenant, name="Terceiro Funcionario")
    EmployeeWorkflowService.aposentar(emp3, reason="Idade legal")
    emp3.refresh_from_db()
    assert emp3.status == Employee.Status.RETIRED
