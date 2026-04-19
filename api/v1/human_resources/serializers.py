from rest_framework import serializers  # DRF base

from apps.human_resources.models.absence import Absence
from apps.human_resources.models.employee import Employee
from apps.human_resources.models.family_dependent import FamilyDependent
from apps.human_resources.models.job_title import JobTitle
from apps.human_resources.models.overtime import Overtime
from apps.human_resources.models.payroll import Payroll
from apps.human_resources.models.termination import Termination
from apps.human_resources.models.vacation import Vacation
from apps.human_resources.models.work_schedule import WorkSchedule


class JobTitleSerializer(serializers.ModelSerializer):
    class Meta:
        model = JobTitle
        fields = "__all__"
        read_only_fields = (  # Protege campos de auditoria/tenant
            "custom_id",
            "tenant",
            "created_at",
            "updated_at",
            "created_by",
            "updated_by",
            "deleted",
            "deleted_at",
            "deleted_by",
        )


class EmployeeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Employee
        fields = "__all__"
        read_only_fields = (
            "custom_id",
            "tenant",
            "created_at",
            "updated_at",
            "created_by",
            "updated_by",
            "deleted",
            "deleted_at",
            "deleted_by",
        )


class FamilyDependentSerializer(serializers.ModelSerializer):
    class Meta:
        model = FamilyDependent
        fields = "__all__"
        read_only_fields = (
            "custom_id",
            "tenant",
            "created_at",
            "updated_at",
            "created_by",
            "updated_by",
            "deleted",
            "deleted_at",
            "deleted_by",
        )


class WorkScheduleSerializer(serializers.ModelSerializer):
    class Meta:
        model = WorkSchedule
        fields = "__all__"
        read_only_fields = (
            "custom_id",
            "tenant",
            "created_at",
            "updated_at",
            "created_by",
            "updated_by",
            "deleted",
            "deleted_at",
            "deleted_by",
        )


class AbsenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Absence
        fields = "__all__"
        read_only_fields = (
            "custom_id",
            "tenant",
            "created_at",
            "updated_at",
            "created_by",
            "updated_by",
            "deleted",
            "deleted_at",
            "deleted_by",
        )


class VacationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Vacation
        fields = "__all__"
        read_only_fields = (
            "custom_id",
            "tenant",
            "created_at",
            "updated_at",
            "created_by",
            "updated_by",
            "deleted",
            "deleted_at",
            "deleted_by",
        )


class TerminationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Termination
        fields = "__all__"
        read_only_fields = (
            "custom_id",
            "tenant",
            "created_at",
            "updated_at",
            "created_by",
            "updated_by",
            "deleted",
            "deleted_at",
            "deleted_by",
        )


class OvertimeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Overtime
        fields = "__all__"
        read_only_fields = (
            "custom_id",
            "tenant",
            "created_at",
            "updated_at",
            "created_by",
            "updated_by",
            "deleted",
            "deleted_at",
            "deleted_by",
        )


class PayrollSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payroll
        fields = "__all__"
        read_only_fields = (
            "custom_id",
            "tenant",
            "created_at",
            "updated_at",
            "created_by",
            "updated_by",
            "deleted",
            "deleted_at",
            "deleted_by",
            "calculated_overtime_hours",
            "hourly_value",
            "overtime_value",
            "total_salary",
        )


SERIALIZER_MAP = {
    "role": JobTitleSerializer,  # Alias -> serializer
    "employee": EmployeeSerializer,
    "agregadofamiliar": FamilyDependentSerializer,
    "horario": WorkScheduleSerializer,
    "falta": AbsenceSerializer,
    "ferias": VacationSerializer,
    "dispensa": TerminationSerializer,
    "horaextra": OvertimeSerializer,
    "folhapagamento": PayrollSerializer,
}

