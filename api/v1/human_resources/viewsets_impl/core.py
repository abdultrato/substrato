from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated  # Restringe acesso
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet  # CRUD base DRF

from api.v1.viewset_mixins import TenantScopedQuerysetMixin, ValidatedSearchOrderingMixin
from apps.human_resources.models.absence import Absence
from apps.human_resources.models.attendance import PresenceRecord as AttendanceRecord
from apps.human_resources.models.contract import Contract
from apps.human_resources.models.disciplinary_process import DisciplinaryProcess
from apps.human_resources.models.employee import Employee
from apps.human_resources.models.employee_document import EmployeeDocument
from apps.human_resources.models.family_dependent import FamilyDependent
from apps.human_resources.models.job_title import JobTitle
from apps.human_resources.models.leave_permission import LeavePermission
from apps.human_resources.models.overtime import Overtime
from apps.human_resources.models.payroll import Payroll
from apps.human_resources.models.payroll_run import PayrollItem, PayrollRun
from apps.human_resources.models.profession import Profession
from apps.human_resources.models.salary_history import SalaryHistory
from apps.human_resources.models.termination import Termination
from apps.human_resources.models.vacation import Vacation
from apps.human_resources.models.vacation_balance import VacationBalance
from apps.human_resources.models.work_schedule import WorkSchedule

from ..filters import (
    AbsenceFilter,
    AttendanceRecordFilter,
    ContractFilter,
    DisciplinaryProcessFilter,
    EmployeeDocumentFilter,
    EmployeeFilter,
    FamilyDependentFilter,
    JobTitleFilter,
    LeavePermissionFilter,
    OvertimeFilter,
    PayrollFilter,
    PayrollItemFilter,
    PayrollRunFilter,
    ProfessionFilter,
    SalaryHistoryFilter,
    TerminationFilter,
    VacationBalanceFilter,
    VacationFilter,
    WorkScheduleFilter,
)
from ..serializers import (
    AbsenceSerializer,
    AttendanceRecordSerializer,
    ContractSerializer,
    DisciplinaryProcessSerializer,
    EmployeeDocumentSerializer,
    EmployeeSerializer,
    FamilyDependentSerializer,
    JobTitleSerializer,
    LeavePermissionSerializer,
    OvertimeSerializer,
    PayrollItemSerializer,
    PayrollRunSerializer,
    PayrollSerializer,
    ProfessionSerializer,
    SalaryHistorySerializer,
    TerminationSerializer,
    VacationBalanceSerializer,
    VacationSerializer,
    WorkScheduleSerializer,
)


class TenantScopedModelViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    permission_classes = [IsAuthenticated]  # Autenticado + escopo tenant


class JobTitleViewSet(TenantScopedModelViewSet):
    queryset = JobTitle.objects.all()
    serializer_class = JobTitleSerializer
    filterset_class = JobTitleFilter
    search_fields = ["custom_id", "name"]
    ordering_fields = ["name", "created_at"]
    ordering = ["name"]


class ProfessionViewSet(TenantScopedModelViewSet):
    queryset = Profession.objects.all()
    serializer_class = ProfessionSerializer
    filterset_class = ProfessionFilter
    search_fields = ["custom_id", "name"]
    ordering_fields = ["name", "active", "created_at"]
    ordering = ["name"]


class EmployeeViewSet(TenantScopedModelViewSet):
    queryset = Employee.objects.select_related("role", "profession").all()
    serializer_class = EmployeeSerializer
    filterset_class = EmployeeFilter
    search_fields = ["custom_id", "name", "profession__name", "email", "phone"]
    ordering_fields = ["name", "profession__name", "admission_date", "status", "created_at"]
    ordering = ["name"]

    def _set_employee_status(self, employee: Employee, status_value: str):
        if employee.status != status_value:
            employee.status = status_value
            employee.save(update_fields=["status"])
        return Response(self.get_serializer(employee).data)

    def destroy(self, request, *args, **kwargs):
        """
        Não remove funcionário: converte DELETE em inativação.
        """
        employee = self.get_object()
        return self._set_employee_status(employee, Employee.Status.INACTIVE)

    @action(detail=True, methods=["post"], url_path="desativar", url_name="desativar")
    def deactivate(self, request, pk=None):
        employee = self.get_object()
        return self._set_employee_status(employee, Employee.Status.INACTIVE)

    @action(detail=True, methods=["post"], url_path="ativar", url_name="ativar")
    def activate(self, request, pk=None):
        employee = self.get_object()
        return self._set_employee_status(employee, Employee.Status.ACTIVE)

    def _workflow(self, request, fn, **kwargs):
        from apps.human_resources.services.employee_workflow import EmployeeWorkflowService

        employee = self.get_object()
        try:
            result = getattr(EmployeeWorkflowService, fn)(employee, user=getattr(request, "user", None), **kwargs)
        except DjangoValidationError as err:
            raise ValidationError(
                getattr(err, "message_dict", None) or getattr(err, "messages", None) or str(err)
            ) from err
        employee.refresh_from_db()
        payload = self.get_serializer(employee).data
        if fn == "iniciar_processo_disciplinar":
            payload = {"employee": payload, "disciplinary_process_id": result.id, "disciplinary_process_code": result.custom_id}
        return Response(payload)

    @action(detail=True, methods=["post"], url_path="iniciar-processo-disciplinar", url_name="iniciar-processo-disciplinar")
    def iniciar_processo_disciplinar(self, request, pk=None):
        """Abre um processo disciplinar (incidente, gravidade e descrição)."""
        data = request.data or {}
        return self._workflow(
            request,
            "iniciar_processo_disciplinar",
            incident_type=data.get("incident_type") or "",
            severity=data.get("severity") or "",
            description=data.get("description") or "",
            incident_date=data.get("incident_date") or None,
            reported_by=data.get("reported_by") or "",
        )

    @action(detail=True, methods=["post"], url_path="promover", url_name="promover")
    def promover(self, request, pk=None):
        """Promove para novo cargo (exige antiguidade e sem processo aberto)."""
        from apps.human_resources.models.job_title import JobTitle

        data = request.data or {}
        role = JobTitle.objects.filter(pk=data.get("role")).first() if data.get("role") else None
        return self._workflow(
            request,
            "promover",
            role=role,
            salary_increase=data.get("salary_increase"),
            reason=data.get("reason") or "",
        )

    @action(detail=True, methods=["post"], url_path="dar-aumento", url_name="dar-aumento")
    def dar_aumento(self, request, pk=None):
        """Aumento salarial (progressão) com registo no histórico salarial."""
        data = request.data or {}
        return self._workflow(request, "dar_aumento", amount=data.get("amount"), reason=data.get("reason") or "")

    @action(detail=True, methods=["post"], url_path="revisao-salarial", url_name="revisao-salarial")
    def revisao_salarial(self, request, pk=None):
        """Revisão salarial (pode reduzir); motivo obrigatório; vai ao histórico."""
        data = request.data or {}
        return self._workflow(
            request,
            "revisao_salarial",
            nominal_salary=data.get("nominal_salary"),
            reason=data.get("reason") or "",
        )

    @action(detail=True, methods=["post"], url_path="aposentar", url_name="aposentar")
    def aposentar(self, request, pk=None):
        """Reforma o funcionário (gera registo de desligamento)."""
        data = request.data or {}
        return self._workflow(request, "aposentar", date=data.get("date") or None, reason=data.get("reason") or "")

    @action(detail=True, methods=["post"], url_path="demitir", url_name="demitir")
    def demitir(self, request, pk=None):
        """Demite o funcionário (motivo obrigatório; gera desligamento)."""
        data = request.data or {}
        return self._workflow(request, "demitir", reason=data.get("reason") or "", date=data.get("date") or None)

    @action(detail=True, methods=["post"], url_path="expulsar", url_name="expulsar")
    def expulsar(self, request, pk=None):
        """Despedimento por justa causa (exige processo disciplinar concluído)."""
        data = request.data or {}
        return self._workflow(request, "expulsar", reason=data.get("reason") or "")

    @action(detail=True, methods=["post"], url_path="deactivate", url_name="deactivate")
    def deactivate_en(self, request, pk=None):
        return self.deactivate(request, pk=pk)

    @action(detail=True, methods=["post"], url_path="activate", url_name="activate")
    def activate_en(self, request, pk=None):
        return self.activate(request, pk=pk)


class FamilyDependentViewSet(TenantScopedModelViewSet):
    queryset = FamilyDependent.objects.select_related("employee").all()
    serializer_class = FamilyDependentSerializer
    filterset_class = FamilyDependentFilter
    search_fields = ["custom_id", "name", "employee__name"]
    ordering_fields = ["name", "relationship", "created_at"]
    ordering = ["name"]


class WorkScheduleViewSet(TenantScopedModelViewSet):
    queryset = WorkSchedule.objects.select_related("employee").all()
    serializer_class = WorkScheduleSerializer
    filterset_class = WorkScheduleFilter
    ordering_fields = ["employee", "weekday", "start_time"]
    ordering = ["employee", "weekday", "start_time"]


class AbsenceViewSet(TenantScopedModelViewSet):
    queryset = Absence.objects.select_related("employee").all()
    serializer_class = AbsenceSerializer
    filterset_class = AbsenceFilter
    ordering_fields = ["date", "created_at"]
    ordering = ["-date", "-created_at"]

    @action(detail=True, methods=["post"], url_path="justificar", url_name="justificar")
    def justificar(self, request, pk=None):
        absence = self.get_object()
        try:
            absence.submit_justification(reason=request.data.get("reason", ""))
        except DjangoValidationError as exc:
            raise ValidationError(getattr(exc, "messages", None) or [str(exc)])
        return Response(self.get_serializer(absence).data)

    @action(detail=True, methods=["post"], url_path="aprovar-justificativa", url_name="aprovar-justificativa")
    def aprovar_justificativa(self, request, pk=None):
        absence = self.get_object()
        try:
            absence.approve_justification()
        except DjangoValidationError as exc:
            raise ValidationError(getattr(exc, "messages", None) or [str(exc)])
        return Response(self.get_serializer(absence).data)

    @action(detail=True, methods=["post"], url_path="rejeitar-justificativa", url_name="rejeitar-justificativa")
    def rejeitar_justificativa(self, request, pk=None):
        absence = self.get_object()
        try:
            absence.reject_justification()
        except DjangoValidationError as exc:
            raise ValidationError(getattr(exc, "messages", None) or [str(exc)])
        return Response(self.get_serializer(absence).data)


class VacationViewSet(TenantScopedModelViewSet):
    queryset = Vacation.objects.select_related("employee").all()
    serializer_class = VacationSerializer
    filterset_class = VacationFilter
    ordering_fields = ["start_date", "status", "created_at"]
    ordering = ["-start_date", "-created_at"]

    @action(detail=True, methods=["post"], url_path="approve", url_name="approve")
    def approve(self, request, pk=None):
        vacation = self.get_object()
        if vacation.status != Vacation.Status.APPROVED:
            vacation.status = Vacation.Status.APPROVED
            vacation.save(update_fields=["status"])
        return Response(self.get_serializer(vacation).data)

    @action(detail=True, methods=["post"], url_path="reject", url_name="reject")
    def reject(self, request, pk=None):
        vacation = self.get_object()
        if vacation.status != Vacation.Status.REJECTED:
            vacation.status = Vacation.Status.REJECTED
            vacation.save(update_fields=["status"])
        return Response(self.get_serializer(vacation).data)


class TerminationViewSet(TenantScopedModelViewSet):
    queryset = Termination.objects.select_related("employee").all()
    serializer_class = TerminationSerializer
    filterset_class = TerminationFilter
    ordering_fields = ["date", "type", "created_at"]
    ordering = ["-date", "-created_at"]


class OvertimeViewSet(TenantScopedModelViewSet):
    queryset = Overtime.objects.select_related("employee").all()
    serializer_class = OvertimeSerializer
    filterset_class = OvertimeFilter
    ordering_fields = ["date", "kind", "created_at"]
    ordering = ["-date", "-created_at"]

    @action(detail=True, methods=["post"], url_path="approve", url_name="approve")
    def approve(self, request, pk=None):
        overtime = self.get_object()
        if overtime.status != Overtime.Status.APPROVED:
            overtime.status = Overtime.Status.APPROVED
            overtime.save(update_fields=["status"])
        return Response(self.get_serializer(overtime).data)

    @action(detail=True, methods=["post"], url_path="reject", url_name="reject")
    def reject(self, request, pk=None):
        overtime = self.get_object()
        if overtime.status != Overtime.Status.REJECTED:
            overtime.status = Overtime.Status.REJECTED
            overtime.save(update_fields=["status"])
        return Response(self.get_serializer(overtime).data)


class DisciplinaryProcessViewSet(TenantScopedModelViewSet):
    queryset = DisciplinaryProcess.objects.select_related("employee").all()
    serializer_class = DisciplinaryProcessSerializer
    filterset_class = DisciplinaryProcessFilter
    ordering_fields = ["incident_date", "severity", "status", "created_at"]
    ordering = ["-incident_date", "-created_at"]


class PayrollViewSet(TenantScopedModelViewSet):
    queryset = Payroll.objects.select_related("employee").all()
    serializer_class = PayrollSerializer
    filterset_class = PayrollFilter
    ordering_fields = ["year", "month", "created_at", "closed"]
    ordering = ["-year", "-month", "-created_at"]


class AttendanceRecordViewSet(TenantScopedModelViewSet):
    queryset = AttendanceRecord.objects.select_related("employee").all()
    serializer_class = AttendanceRecordSerializer
    filterset_class = AttendanceRecordFilter
    search_fields = ["custom_id", "employee__name"]
    ordering_fields = ["date", "status", "created_at"]
    ordering = ["-date", "-created_at"]


class LeavePermissionViewSet(TenantScopedModelViewSet):
    queryset = LeavePermission.objects.select_related("employee", "approved_by").all()
    serializer_class = LeavePermissionSerializer
    filterset_class = LeavePermissionFilter
    search_fields = ["custom_id", "employee__name"]
    ordering_fields = ["permission_date", "status", "created_at"]
    ordering = ["-permission_date", "-created_at"]

    @action(detail=True, methods=["post"], url_path="approve", url_name="approve")
    def approve(self, request, pk=None):
        leave = self.get_object()
        if leave.status != LeavePermission.Status.APPROVED:
            leave.status = LeavePermission.Status.APPROVED
            leave.save(update_fields=["status"])
        return Response(self.get_serializer(leave).data)

    @action(detail=True, methods=["post"], url_path="reject", url_name="reject")
    def reject(self, request, pk=None):
        leave = self.get_object()
        if leave.status != LeavePermission.Status.REJECTED:
            leave.status = LeavePermission.Status.REJECTED
            leave.save(update_fields=["status"])
        return Response(self.get_serializer(leave).data)


class VacationBalanceViewSet(TenantScopedModelViewSet):
    queryset = VacationBalance.objects.select_related("employee").all()
    serializer_class = VacationBalanceSerializer
    filterset_class = VacationBalanceFilter
    search_fields = ["custom_id", "employee__name"]
    ordering_fields = ["year", "employee", "created_at"]
    ordering = ["-year", "employee"]


class ContractViewSet(TenantScopedModelViewSet):
    queryset = Contract.objects.select_related("employee").all()
    serializer_class = ContractSerializer
    filterset_class = ContractFilter
    search_fields = ["custom_id", "employee__name"]
    ordering_fields = ["start_date", "contract_type", "status", "created_at"]
    ordering = ["-start_date", "-created_at"]


class EmployeeDocumentViewSet(TenantScopedModelViewSet):
    queryset = EmployeeDocument.objects.select_related("employee").all()
    serializer_class = EmployeeDocumentSerializer
    filterset_class = EmployeeDocumentFilter
    search_fields = ["custom_id", "title", "employee__name"]
    ordering_fields = ["document_type", "status", "created_at"]
    ordering = ["employee", "document_type", "title"]


class SalaryHistoryViewSet(TenantScopedModelViewSet):
    queryset = SalaryHistory.objects.select_related("employee").all()
    serializer_class = SalaryHistorySerializer
    filterset_class = SalaryHistoryFilter
    search_fields = ["custom_id", "employee__name"]
    ordering_fields = ["effective_from", "is_current", "created_at"]
    ordering = ["-effective_from", "-created_at"]


class PayrollRunViewSet(TenantScopedModelViewSet):
    queryset = PayrollRun.objects.select_related("approved_by").all()
    serializer_class = PayrollRunSerializer
    filterset_class = PayrollRunFilter
    search_fields = ["custom_id", "payroll_period"]
    ordering_fields = ["payroll_period", "status", "created_at"]
    ordering = ["-payroll_period", "-created_at"]

    @action(detail=True, methods=["post"], url_path="calculate", url_name="calculate")
    def calculate(self, request, pk=None):
        payroll_run = self.get_object()
        payroll_run.recalculate_totals()
        payroll_run.status = PayrollRun.Status.CALCULATED
        payroll_run.save(update_fields=["total_gross", "total_deductions", "total_net", "status"])
        return Response(self.get_serializer(payroll_run).data)

    @action(detail=True, methods=["post"], url_path="approve", url_name="approve")
    def approve(self, request, pk=None):
        payroll_run = self.get_object()
        if payroll_run.status != PayrollRun.Status.APPROVED:
            payroll_run.status = PayrollRun.Status.APPROVED
            payroll_run.save(update_fields=["status"])
        return Response(self.get_serializer(payroll_run).data)

    @action(detail=True, methods=["post"], url_path="mark-paid", url_name="mark_paid")
    def mark_paid(self, request, pk=None):
        payroll_run = self.get_object()
        if payroll_run.status != PayrollRun.Status.PAID:
            payroll_run.status = PayrollRun.Status.PAID
            payroll_run.save(update_fields=["status"])
        return Response(self.get_serializer(payroll_run).data)


class PayrollItemViewSet(TenantScopedModelViewSet):
    queryset = PayrollItem.objects.select_related("payroll_run", "employee").all()
    serializer_class = PayrollItemSerializer
    filterset_class = PayrollItemFilter
    search_fields = ["custom_id", "employee__name", "payroll_run__payroll_period"]
    ordering_fields = ["payroll_run", "employee", "status", "created_at"]
    ordering = ["payroll_run", "employee"]


VIEWSET_MAP = {
    "role": JobTitleViewSet,
    "profissao": ProfessionViewSet,
    "employee": EmployeeViewSet,
    "processodisciplinar": DisciplinaryProcessViewSet,
    "agregadofamiliar": FamilyDependentViewSet,
    "horario": WorkScheduleViewSet,
    "falta": AbsenceViewSet,
    "ferias": VacationViewSet,
    "dispensa": TerminationViewSet,
    "horaextra": OvertimeViewSet,
    "folhapagamento": PayrollViewSet,
    "assiduidade": AttendanceRecordViewSet,
    "licenca": LeavePermissionViewSet,
    "saldo_ferias": VacationBalanceViewSet,
    "contrato": ContractViewSet,
    "documento_funcionario": EmployeeDocumentViewSet,
    "historico_salarial": SalaryHistoryViewSet,
    "folha_run": PayrollRunViewSet,
    "folha_item": PayrollItemViewSet,
}

__all__ = [
    "VIEWSET_MAP",
    "AbsenceViewSet",
    "AttendanceRecordViewSet",
    "ContractViewSet",
    "DisciplinaryProcessViewSet",
    "EmployeeDocumentViewSet",
    "EmployeeViewSet",
    "FamilyDependentViewSet",
    "JobTitleViewSet",
    "LeavePermissionViewSet",
    "OvertimeViewSet",
    "PayrollItemViewSet",
    "PayrollRunViewSet",
    "PayrollViewSet",
    "ProfessionViewSet",
    "SalaryHistoryViewSet",
    "TerminationViewSet",
    "VacationBalanceViewSet",
    "VacationViewSet",
    "WorkScheduleViewSet",
]

