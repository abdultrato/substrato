from rest_framework import serializers  # DRF base

from api.v1.compat import LegacyAliasSerializerMixin
from apps.human_resources.models.absence import Absence
from apps.human_resources.models.disciplinary_process import DisciplinaryProcess
from apps.human_resources.models.employee import Employee
from apps.human_resources.models.family_dependent import FamilyDependent
from apps.human_resources.models.job_title import JobTitle
from apps.human_resources.models.overtime import Overtime
from apps.human_resources.models.payroll import Payroll
from apps.human_resources.models.profession import Profession
from apps.human_resources.models.termination import Termination
from apps.human_resources.models.vacation import Vacation
from apps.human_resources.models.work_schedule import WorkSchedule

CORE_READ_ONLY_FIELDS = (
    "id",
    "custom_id",
    "tenant",
    "created_at",
    "updated_at",
    "created_by",
    "updated_by",
    "deleted",
    "deleted_at",
    "deleted_by",
    "version",
)

JOB_TITLE_ALIASES = {
    "id_custom": "custom_id",
    "nome": "name",
    "cargo": "name",
    "funcao": "name",
    "função": "name",
    "descricao": "description",
    "descrição": "description",
    "medico": "is_doctor",
    "médico": "is_doctor",
    "e_medico": "is_doctor",
    "é_médico": "is_doctor",
    "is_physician": "is_doctor",
}

PROFESSION_ALIASES = {
    "id_custom": "custom_id",
    "nome": "name",
    "profissao": "name",
    "profissão": "name",
    "descricao": "description",
    "descrição": "description",
    "salario_base": "base_salary",
    "salário_base": "base_salary",
    "valor_hora_ordinaria": "ordinary_hour_value",
    "valor_hora_ordinária": "ordinary_hour_value",
    "valor_hora_extraordinaria": "extraordinary_hour_value",
    "valor_hora_extraordinária": "extraordinary_hour_value",
    "progressao_meses": "minimum_progression_months",
    "progressão_meses": "minimum_progression_months",
    "meses_progressao": "minimum_progression_months",
    "meses_progressão": "minimum_progression_months",
    "mudanca_carreira_meses": "minimum_career_change_months",
    "mudança_carreira_meses": "minimum_career_change_months",
    "aumento_agregado": "family_allowance_per_dependent",
    "subsidio_agregado": "family_allowance_per_dependent",
    "subsídio_agregado": "family_allowance_per_dependent",
    "ativo": "active",
    "activa": "active",
}

EMPLOYEE_ALIASES = {
    "id_custom": "custom_id",
    "nome": "name",
    "funcionario": "name",
    "funcionário": "name",
    "cargo": "role",
    "funcao": "role",
    "função": "role",
    "profissao": "profession",
    "profissão": "profession",
    "numero_fiscal": "nuit",
    "número_fiscal": "nuit",
    "conta_bancaria": "nib",
    "conta_bancária": "nib",
    "documento": "document_number",
    "numero_documento": "document_number",
    "número_documento": "document_number",
    "telefone": "phone",
    "contacto": "phone",
    "contato": "phone",
    "data_admissao": "admission_date",
    "data_admissão": "admission_date",
    "admissao": "admission_date",
    "admissão": "admission_date",
    "estado": "status",
    "situacao": "status",
    "situação": "status",
    "salario_nominal": "nominal_salary",
    "salário_nominal": "nominal_salary",
    "salario_base": "nominal_salary",
    "salário_base": "nominal_salary",
    "salario_liquido": "salary_liquido",
    "salário_liquido": "salary_liquido",
    "salário_líquido": "salary_liquido",
    "abonos_salariais": "salary_allowances_value",
    "aumento_salarial": "salary_increase",
    "aumento": "salary_increase",
    "horas_base": "base_month_hours",
    "horas_base_mes": "base_month_hours",
    "valor_hora_ordinaria": "ordinary_hour_value",
    "valor_hora_ordinária": "ordinary_hour_value",
    "valor_hora_extraordinaria": "extraordinary_hour_value",
    "valor_hora_extraordinária": "extraordinary_hour_value",
    "progressao_meses": "minimum_progression_months",
    "progressão_meses": "minimum_progression_months",
    "mudanca_carreira_meses": "minimum_career_change_months",
    "mudança_carreira_meses": "minimum_career_change_months",
    "aumento_agregado": "family_allowance_per_dependent",
}

FAMILY_DEPENDENT_ALIASES = {
    "id_custom": "custom_id",
    "nome": "name",
    "dependente": "name",
    "agregado": "name",
    "funcionario": "employee",
    "funcionário": "employee",
    "parentesco": "relationship",
    "relacao": "relationship",
    "relação": "relationship",
    "data_nascimento": "birth_date",
    "nascimento": "birth_date",
    "telefone": "phone",
    "contacto": "phone",
    "vive_com_funcionario": "lives_with_employee",
    "vive_com_funcionário": "lives_with_employee",
    "observacoes": "notes",
    "observações": "notes",
    "notas": "notes",
}

WORK_SCHEDULE_ALIASES = {
    "id_custom": "custom_id",
    "funcionario": "employee",
    "funcionário": "employee",
    "dia_semana": "weekday",
    "dia": "weekday",
    "inicio": "start_time",
    "início": "start_time",
    "hora_inicio": "start_time",
    "hora_início": "start_time",
    "fim": "end_time",
    "hora_fim": "end_time",
    "ativo": "active",
}

ABSENCE_ALIASES = {
    "id_custom": "custom_id",
    "funcionario": "employee",
    "funcionário": "employee",
    "data": "date",
    "motivo": "reason",
    "razao": "reason",
    "razão": "reason",
    "justificada": "justified",
    "justificado": "justified",
}

VACATION_ALIASES = {
    "id_custom": "custom_id",
    "funcionario": "employee",
    "funcionário": "employee",
    "inicio": "start_date",
    "início": "start_date",
    "data_inicio": "start_date",
    "data_início": "start_date",
    "fim": "end_date",
    "data_fim": "end_date",
    "estado": "status",
    "observacoes": "notes",
    "observações": "notes",
    "notas": "notes",
}

TERMINATION_ALIASES = {
    "id_custom": "custom_id",
    "funcionario": "employee",
    "funcionário": "employee",
    "data": "date",
    "tipo": "type",
    "motivo": "reason",
    "razao": "reason",
    "razão": "reason",
}

OVERTIME_ALIASES = {
    "id_custom": "custom_id",
    "funcionario": "employee",
    "funcionário": "employee",
    "data": "date",
    "tipo": "kind",
    "horas": "hours",
    "multiplicador": "multiplier",
    "observacoes": "notes",
    "observações": "notes",
    "notas": "notes",
}

DISCIPLINARY_PROCESS_ALIASES = {
    "id_custom": "custom_id",
    "funcionario": "employee",
    "funcionário": "employee",
    "data_incidente": "incident_date",
    "incidente_em": "incident_date",
    "tipo_incidente": "incident_type",
    "tipo": "incident_type",
    "gravidade": "severity",
    "descricao": "description",
    "descrição": "description",
    "acao_aplicada": "action_taken",
    "ação_aplicada": "action_taken",
    "acao_disciplinar": "action_taken",
    "ação_disciplinar": "action_taken",
    "estado": "status",
    "encerrado_em": "resolved_at",
    "data_encerramento": "resolved_at",
    "observacoes": "notes",
    "observações": "notes",
    "notas": "notes",
}

PAYROLL_ALIASES = {
    "id_custom": "custom_id",
    "funcionario": "employee",
    "funcionário": "employee",
    "ano": "year",
    "mes": "month",
    "mês": "month",
    "salario_nominal": "nominal_salary",
    "salário_nominal": "nominal_salary",
    "salario_base": "nominal_salary",
    "salário_base": "nominal_salary",
    "horas_base": "base_month_hours",
    "multiplicador_hora_extra": "overtime_hour_multiplier",
    "outros_descontos": "other_discounts_value",
    "desconto_disciplinar": "disciplinary_discount_value",
    "fechada": "closed",
    "fechado": "closed",
}


class JobTitleSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    legacy_input_aliases = JOB_TITLE_ALIASES
    legacy_output_aliases = JOB_TITLE_ALIASES

    class Meta:
        model = JobTitle
        fields = "__all__"
        read_only_fields = CORE_READ_ONLY_FIELDS


class ProfessionSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    legacy_input_aliases = PROFESSION_ALIASES
    legacy_output_aliases = PROFESSION_ALIASES

    class Meta:
        model = Profession
        fields = "__all__"
        read_only_fields = CORE_READ_ONLY_FIELDS


class EmployeeSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    legacy_input_aliases = EMPLOYEE_ALIASES
    legacy_output_aliases = EMPLOYEE_ALIASES
    salary_base = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    salary_liquido = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    salary_allowances_value = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)

    class Meta:
        model = Employee
        fields = "__all__"
        read_only_fields = (
            *CORE_READ_ONLY_FIELDS,
            "salary_base",
            "salary_liquido",
            "salary_allowances_value",
        )


class DisciplinaryProcessSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    legacy_input_aliases = DISCIPLINARY_PROCESS_ALIASES
    legacy_output_aliases = DISCIPLINARY_PROCESS_ALIASES

    class Meta:
        model = DisciplinaryProcess
        fields = "__all__"
        read_only_fields = CORE_READ_ONLY_FIELDS


class FamilyDependentSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    legacy_input_aliases = FAMILY_DEPENDENT_ALIASES
    legacy_output_aliases = FAMILY_DEPENDENT_ALIASES

    class Meta:
        model = FamilyDependent
        fields = "__all__"
        read_only_fields = CORE_READ_ONLY_FIELDS


class WorkScheduleSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    legacy_input_aliases = WORK_SCHEDULE_ALIASES
    legacy_output_aliases = WORK_SCHEDULE_ALIASES

    class Meta:
        model = WorkSchedule
        fields = "__all__"
        read_only_fields = CORE_READ_ONLY_FIELDS


class AbsenceSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    legacy_input_aliases = ABSENCE_ALIASES
    legacy_output_aliases = ABSENCE_ALIASES

    class Meta:
        model = Absence
        fields = "__all__"
        read_only_fields = CORE_READ_ONLY_FIELDS


class VacationSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    legacy_input_aliases = VACATION_ALIASES
    legacy_output_aliases = VACATION_ALIASES

    class Meta:
        model = Vacation
        fields = "__all__"
        read_only_fields = CORE_READ_ONLY_FIELDS


class TerminationSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    legacy_input_aliases = TERMINATION_ALIASES
    legacy_output_aliases = TERMINATION_ALIASES

    class Meta:
        model = Termination
        fields = "__all__"
        read_only_fields = CORE_READ_ONLY_FIELDS


class OvertimeSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    legacy_input_aliases = OVERTIME_ALIASES
    legacy_output_aliases = OVERTIME_ALIASES

    class Meta:
        model = Overtime
        fields = "__all__"
        read_only_fields = CORE_READ_ONLY_FIELDS


class PayrollSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    legacy_input_aliases = PAYROLL_ALIASES
    legacy_output_aliases = PAYROLL_ALIASES

    class Meta:
        model = Payroll
        fields = "__all__"
        read_only_fields = (
            *CORE_READ_ONLY_FIELDS,
            "calculated_overtime_hours",
            "ordinary_hours",
            "extraordinary_hours",
            "ordinary_hour_value",
            "extraordinary_hour_value",
            "ordinary_hours_value",
            "extraordinary_hours_value",
            "salary_increase_value",
            "tenure_increase_value",
            "family_dependents_count",
            "family_allowance_value",
            "absence_days",
            "discounted_absence_days",
            "daily_salary_value",
            "absence_discount_value",
            "gross_salary",
            "hourly_value",
            "overtime_value",
            "total_salary",
        )


SERIALIZER_MAP = {
    "role": JobTitleSerializer,  # Alias -> serializer
    "profissao": ProfessionSerializer,
    "employee": EmployeeSerializer,
    "processodisciplinar": DisciplinaryProcessSerializer,
    "agregadofamiliar": FamilyDependentSerializer,
    "horario": WorkScheduleSerializer,
    "falta": AbsenceSerializer,
    "ferias": VacationSerializer,
    "dispensa": TerminationSerializer,
    "horaextra": OvertimeSerializer,
    "folhapagamento": PayrollSerializer,
}
