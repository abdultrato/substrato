"""Fluxos reais de RH sobre o funcionário.

Regras (espelham práticas correntes de departamentos de RH):
- Promoção: exige funcionário ativo, antiguidade mínima para mudança de
  carreira e ausência de processo disciplinar aberto.
- Aumento: exige funcionário ativo, antiguidade mínima de progressão e
  ausência de processo disciplinar aberto; todo o ajuste fica no
  histórico salarial.
- Revisão salarial (incl. redução): exige motivo obrigatório; fica no
  histórico salarial.
- Aposentação/demissão: geram registo de desligamento (Termination) e
  mudam o estado do funcionário.
- Expulsão (justa causa): exige processo disciplinar concluído com
  sanção de despedimento.
- Funcionário nunca é eliminado: o desligamento é sempre por estado.
"""

from __future__ import annotations

from decimal import Decimal

from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone

from ..models.disciplinary_process import DisciplinaryProcess
from ..models.employee import Employee
from ..models.salary_history import SalaryHistory
from ..models.termination import Termination

TERMINAL_STATUSES = {
    Employee.Status.TERMINATED,
    Employee.Status.RETIRED,
    Employee.Status.DECEASED,
}


def _require_active(employee: Employee, operation: str):
    if employee.status in TERMINAL_STATUSES:
        raise ValidationError(f"Funcionário desligado/reformado não pode {operation}.")
    if employee.status != Employee.Status.ACTIVE:
        raise ValidationError(f"Apenas funcionários ativos podem {operation}.")


def _require_no_open_disciplinary(employee: Employee, operation: str):
    if employee.has_open_disciplinary_process:
        raise ValidationError(
            f"Funcionário com processo disciplinar aberto não pode {operation}."
        )


def _registar_historico_salarial(employee: Employee, reason: str):
    SalaryHistory.objects.create(
        tenant=employee.tenant,
        employee=employee,
        amount=employee.current_salary,
        effective_from=timezone.localdate(),
        is_current=True,
        reason=reason,
    )


class EmployeeWorkflowService:
    @staticmethod
    @transaction.atomic
    def iniciar_processo_disciplinar(
        employee: Employee,
        *,
        incident_type: str = "",
        severity: str = "",
        description: str = "",
        incident_date=None,
        reported_by: str = "",
        user=None,
    ) -> DisciplinaryProcess:
        if employee.status in TERMINAL_STATUSES:
            raise ValidationError("Funcionário desligado não pode ter novo processo disciplinar.")
        if not (description or "").strip():
            raise ValidationError({"description": "Descreva o incidente que origina o processo."})

        severity_value = (severity or DisciplinaryProcess.Severity.MODERATE).upper()
        valid_severities = {choice for choice, _ in DisciplinaryProcess.Severity.choices}
        if severity_value not in valid_severities:
            raise ValidationError({"severity": "Gravidade inválida."})

        return DisciplinaryProcess.objects.create(
            tenant=employee.tenant,
            employee=employee,
            incident_type=(incident_type or "").strip(),
            severity=severity_value,
            description=description.strip(),
            incident_date=incident_date or timezone.localdate(),
            reported_by=(reported_by or getattr(user, "get_full_name", lambda: "")() or getattr(user, "username", "") or "").strip(),
            status=DisciplinaryProcess.Status.OPEN,
        )

    @staticmethod
    @transaction.atomic
    def promover(employee: Employee, *, role, salary_increase=None, reason: str = "", user=None) -> Employee:
        _require_active(employee, "ser promovido")
        _require_no_open_disciplinary(employee, "ser promovido")

        if role is None:
            raise ValidationError({"role": "Indique o novo cargo."})
        if employee.role_id == getattr(role, "id", None):
            raise ValidationError({"role": "O funcionário já ocupa esse cargo."})
        if not employee.can_change_career:
            raise ValidationError(
                "Antiguidade insuficiente para mudança de carreira "
                f"(mínimo {employee.minimum_career_change_months} meses)."
            )

        old_role = employee.role.name if employee.role_id else "sem cargo"
        employee.role = role

        increase = Decimal(str(salary_increase or "0"))
        if increase < 0:
            raise ValidationError({"salary_increase": "O aumento associado à promoção não pode ser negativo."})
        update_fields = ["role", "updated_at"]
        if increase > 0:
            employee.salary_increase = (employee.salary_increase or Decimal("0")) + increase
            update_fields.append("salary_increase")

        employee.save(update_fields=update_fields)
        _registar_historico_salarial(
            employee,
            reason or f"Promoção: {old_role} → {role.name}",
        )
        return employee

    @staticmethod
    @transaction.atomic
    def dar_aumento(employee: Employee, *, amount, reason: str = "", user=None) -> Employee:
        _require_active(employee, "receber aumento")
        _require_no_open_disciplinary(employee, "receber aumento")

        increase = Decimal(str(amount or "0"))
        if increase <= 0:
            raise ValidationError({"amount": "Indique um valor de aumento positivo."})
        if not employee.can_progress_salary:
            raise ValidationError(
                "Antiguidade insuficiente para progressão salarial "
                f"(mínimo {employee.minimum_progression_months} meses)."
            )

        employee.salary_increase = (employee.salary_increase or Decimal("0")) + increase
        employee.save(update_fields=["salary_increase", "updated_at"])
        _registar_historico_salarial(employee, reason or f"Aumento salarial de {increase}")
        return employee

    @staticmethod
    @transaction.atomic
    def revisao_salarial(employee: Employee, *, nominal_salary, reason: str, user=None) -> Employee:
        _require_active(employee, "ter revisão salarial")

        if not (reason or "").strip():
            raise ValidationError({"reason": "A revisão salarial exige motivo registado."})
        new_salary = Decimal(str(nominal_salary if nominal_salary is not None else "-1"))
        if new_salary < 0:
            raise ValidationError({"nominal_salary": "Indique o novo salário nominal."})

        employee.nominal_salary = new_salary
        # A revisão fixa um novo salário de referência: zera aumentos acumulados.
        employee.salary_increase = Decimal("0.00")
        employee.save(update_fields=["nominal_salary", "salary_increase", "updated_at"])
        _registar_historico_salarial(employee, f"Revisão salarial: {reason.strip()}")
        return employee

    @staticmethod
    @transaction.atomic
    def aposentar(employee: Employee, *, date=None, reason: str = "", user=None) -> Employee:
        if employee.status == Employee.Status.RETIRED:
            raise ValidationError("Funcionário já está reformado.")
        if employee.status in TERMINAL_STATUSES:
            raise ValidationError("Funcionário desligado não pode ser reformado.")

        Termination.objects.create(
            tenant=employee.tenant,
            employee=employee,
            date=date or timezone.localdate(),
            type=Termination.Type.OTHER,
            reason=reason or "Aposentação/reforma",
        )
        employee.status = Employee.Status.RETIRED
        employee.save(update_fields=["status", "updated_at"])
        return employee

    @staticmethod
    @transaction.atomic
    def demitir(employee: Employee, *, reason: str, date=None, user=None) -> Employee:
        if employee.status in TERMINAL_STATUSES:
            raise ValidationError("Funcionário já está desligado.")
        if not (reason or "").strip():
            raise ValidationError({"reason": "A demissão exige motivo registado."})

        Termination.objects.create(
            tenant=employee.tenant,
            employee=employee,
            date=date or timezone.localdate(),
            type=Termination.Type.DISMISSAL,
            reason=reason.strip(),
        )
        employee.status = Employee.Status.TERMINATED
        employee.save(update_fields=["status", "updated_at"])
        return employee

    @staticmethod
    @transaction.atomic
    def expulsar(employee: Employee, *, reason: str = "", user=None) -> Employee:
        if employee.status in TERMINAL_STATUSES:
            raise ValidationError("Funcionário já está desligado.")

        # Justa causa: exige processo disciplinar concluído com sanção de despedimento.
        has_termination_sanction = DisciplinaryProcess.objects.filter(
            employee=employee,
            deleted=False,
            sanction=DisciplinaryProcess.Sanction.TERMINATION,
            status__in=[
                DisciplinaryProcess.Status.SANCTION_APPLIED,
                DisciplinaryProcess.Status.CLOSED,
            ],
        ).exists()
        if not has_termination_sanction:
            raise ValidationError(
                "Expulsão (justa causa) exige processo disciplinar concluído com sanção de despedimento."
            )

        Termination.objects.create(
            tenant=employee.tenant,
            employee=employee,
            date=timezone.localdate(),
            type=Termination.Type.TERMINATION,
            reason=f"Justa causa: {reason.strip()}" if (reason or "").strip() else "Justa causa (processo disciplinar)",
        )
        employee.status = Employee.Status.TERMINATED
        employee.save(update_fields=["status", "updated_at"])
        return employee
