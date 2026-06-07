from rest_framework import serializers  # DRF base

from api.v1.compat import LegacyAliasSerializerMixin
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

ATTENDANCE_RECORD_ALIASES = {
    "id_custom": "custom_id",
    "funcionario": "employee",
    "funcionário": "employee",
    "data": "date",
    "entrada": "clock_in",
    "hora_entrada": "clock_in",
    "saida": "clock_out",
    "saída": "clock_out",
    "hora_saida": "clock_out",
    "hora_saída": "clock_out",
    "entrada_prevista": "expected_start",
    "saida_prevista": "expected_end",
    "saída_prevista": "expected_end",
    "minutos_atraso": "late_minutes",
    "atraso": "late_minutes",
    "minutos_saida_antecipada": "early_leave_minutes",
    "saida_antecipada": "early_leave_minutes",
    "saída_antecipada": "early_leave_minutes",
    "horas_trabalhadas": "worked_hours",
    "estado": "status",
    "observacoes": "notes",
    "observações": "notes",
    "notas": "notes",
}

LEAVE_PERMISSION_ALIASES = {
    "id_custom": "custom_id",
    "funcionario": "employee",
    "funcionário": "employee",
    "data": "permission_date",
    "data_dispensa": "permission_date",
    "hora_saida": "start_time",
    "hora_saída": "start_time",
    "hora_retorno": "end_time",
    "motivo": "reason",
    "razao": "reason",
    "razão": "reason",
    "aprovado_por": "approved_by",
    "remunerada": "paid_permission",
    "paga": "paid_permission",
    "descontar_horas": "deduct_from_hours",
    "estado": "status",
}

VACATION_BALANCE_ALIASES = {
    "id_custom": "custom_id",
    "funcionario": "employee",
    "funcionário": "employee",
    "ano": "year",
    "dias_direito": "entitled_days",
    "dias_utilizados": "used_days",
    "dias_pendentes": "pending_days",
    "dias_restantes": "remaining_days",
    "dias_transitados": "carried_over_days",
    "transitados": "carried_over_days",
}

CONTRACT_ALIASES = {
    "id_custom": "custom_id",
    "funcionario": "employee",
    "funcionário": "employee",
    "tipo": "contract_type",
    "tipo_contrato": "contract_type",
    "inicio": "start_date",
    "início": "start_date",
    "data_inicio": "start_date",
    "data_início": "start_date",
    "fim": "end_date",
    "data_fim": "end_date",
    "salario": "salary",
    "salário": "salary",
    "observacoes": "notes",
    "observações": "notes",
    "notas": "notes",
    "estado": "status",
}

EMPLOYEE_DOCUMENT_ALIASES = {
    "id_custom": "custom_id",
    "funcionario": "employee",
    "funcionário": "employee",
    "tipo": "document_type",
    "tipo_documento": "document_type",
    "titulo": "title",
    "título": "title",
    "ficheiro": "file",
    "arquivo": "file",
    "observacoes": "notes",
    "observações": "notes",
    "notas": "notes",
    "estado": "status",
}

SALARY_HISTORY_ALIASES = {
    "id_custom": "custom_id",
    "funcionario": "employee",
    "funcionário": "employee",
    "valor": "amount",
    "salario": "amount",
    "salário": "amount",
    "vigente_a_partir": "effective_from",
    "inicio_vigencia": "effective_from",
    "início_vigência": "effective_from",
    "fim_vigencia": "effective_until",
    "fim_vigência": "effective_until",
    "vigente_ate": "effective_until",
    "vigente_até": "effective_until",
    "atual": "is_current",
    "e_atual": "is_current",
    "é_atual": "is_current",
    "motivo": "reason",
    "razao": "reason",
    "razão": "reason",
}

PAYROLL_RUN_ALIASES = {
    "id_custom": "custom_id",
    "periodo": "payroll_period",
    "período": "payroll_period",
    "periodo_pagamento": "payroll_period",
    "período_pagamento": "payroll_period",
    "inicio": "start_date",
    "início": "start_date",
    "data_inicio": "start_date",
    "data_início": "start_date",
    "fim": "end_date",
    "data_fim": "end_date",
    "aprovado_por": "approved_by",
    "total_bruto": "total_gross",
    "total_descontos": "total_deductions",
    "total_liquido": "total_net",
    "total_líquido": "total_net",
    "estado": "status",
    "observacoes": "notes",
    "observações": "notes",
    "notas": "notes",
}

PAYROLL_ITEM_ALIASES = {
    "id_custom": "custom_id",
    "folha": "payroll_run",
    "folha_run": "payroll_run",
    "funcionario": "employee",
    "funcionário": "employee",
    "salario_base": "base_salary",
    "salário_base": "base_salary",
    "horas_extras": "overtime_amount",
    "valor_horas_extras": "overtime_amount",
    "subsidios": "allowances",
    "subsídios": "allowances",
    "bonus": "bonuses",
    "bónus": "bonuses",
    "descontos_faltas": "absence_deductions",
    "outros_descontos": "other_deductions",
    "salario_bruto": "gross_pay",
    "salário_bruto": "gross_pay",
    "salario_liquido": "net_pay",
    "salário_líquido": "net_pay",
    "estado": "status",
    "observacoes": "notes",
    "observações": "notes",
    "notas": "notes",
}


class JobTitleSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    legacy_input_aliases = JOB_TITLE_ALIASES

    class Meta:
        model = JobTitle
        fields = "__all__"
        read_only_fields = CORE_READ_ONLY_FIELDS


class ProfessionSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    legacy_input_aliases = PROFESSION_ALIASES

    class Meta:
        model = Profession
        fields = "__all__"
        read_only_fields = CORE_READ_ONLY_FIELDS


class EmployeeSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    legacy_input_aliases = EMPLOYEE_ALIASES
    role_name = serializers.CharField(source="role.name", read_only=True, default=None)
    profession_name = serializers.CharField(source="profession.name", read_only=True, default=None)
    salary_base = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    salary_liquido = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    salary_allowances_value = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)

    class Meta:
        model = Employee
        fields = "__all__"
        read_only_fields = (
            *CORE_READ_ONLY_FIELDS,
            "role_name",
            "profession_name",
            "salary_base",
            "salary_liquido",
            "salary_allowances_value",
        )


class DisciplinaryProcessSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    legacy_input_aliases = DISCIPLINARY_PROCESS_ALIASES

    class Meta:
        model = DisciplinaryProcess
        fields = "__all__"
        read_only_fields = CORE_READ_ONLY_FIELDS


class FamilyDependentSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    legacy_input_aliases = FAMILY_DEPENDENT_ALIASES

    class Meta:
        model = FamilyDependent
        fields = "__all__"
        read_only_fields = CORE_READ_ONLY_FIELDS


class WorkScheduleSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    legacy_input_aliases = WORK_SCHEDULE_ALIASES

    class Meta:
        model = WorkSchedule
        fields = "__all__"
        read_only_fields = CORE_READ_ONLY_FIELDS


class AbsenceSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    legacy_input_aliases = ABSENCE_ALIASES

    class Meta:
        model = Absence
        fields = "__all__"
        read_only_fields = CORE_READ_ONLY_FIELDS


class VacationSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    legacy_input_aliases = VACATION_ALIASES

    class Meta:
        model = Vacation
        fields = "__all__"
        read_only_fields = CORE_READ_ONLY_FIELDS


class TerminationSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    legacy_input_aliases = TERMINATION_ALIASES

    class Meta:
        model = Termination
        fields = "__all__"
        read_only_fields = CORE_READ_ONLY_FIELDS


class OvertimeSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    legacy_input_aliases = OVERTIME_ALIASES

    class Meta:
        model = Overtime
        fields = "__all__"
        read_only_fields = CORE_READ_ONLY_FIELDS


class PayrollSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    legacy_input_aliases = PAYROLL_ALIASES

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


class AttendanceRecordSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    legacy_input_aliases = ATTENDANCE_RECORD_ALIASES
    employee_name = serializers.CharField(source="employee.name", read_only=True)

    class Meta:
        model = AttendanceRecord
        fields = "__all__"
        read_only_fields = (
            *CORE_READ_ONLY_FIELDS,
            "employee_name",
        )


class LeavePermissionSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    legacy_input_aliases = LEAVE_PERMISSION_ALIASES
    employee_name = serializers.CharField(source="employee.name", read_only=True)

    class Meta:
        model = LeavePermission
        fields = "__all__"
        read_only_fields = (
            *CORE_READ_ONLY_FIELDS,
            "employee_name",
        )


class VacationBalanceSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    legacy_input_aliases = VACATION_BALANCE_ALIASES
    employee_name = serializers.CharField(source="employee.name", read_only=True)

    class Meta:
        model = VacationBalance
        fields = "__all__"
        read_only_fields = (
            *CORE_READ_ONLY_FIELDS,
            "employee_name",
            "remaining_days",
        )


class ContractSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    legacy_input_aliases = CONTRACT_ALIASES
    employee_name = serializers.CharField(source="employee.name", read_only=True)

    class Meta:
        model = Contract
        fields = "__all__"
        read_only_fields = (
            *CORE_READ_ONLY_FIELDS,
            "employee_name",
        )


class EmployeeDocumentSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    legacy_input_aliases = EMPLOYEE_DOCUMENT_ALIASES
    employee_name = serializers.CharField(source="employee.name", read_only=True)

    class Meta:
        model = EmployeeDocument
        fields = "__all__"
        read_only_fields = (
            *CORE_READ_ONLY_FIELDS,
            "employee_name",
        )


class SalaryHistorySerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    legacy_input_aliases = SALARY_HISTORY_ALIASES
    employee_name = serializers.CharField(source="employee.name", read_only=True)

    class Meta:
        model = SalaryHistory
        fields = "__all__"
        read_only_fields = (
            *CORE_READ_ONLY_FIELDS,
            "employee_name",
        )


class PayrollRunSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    legacy_input_aliases = PAYROLL_RUN_ALIASES

    class Meta:
        model = PayrollRun
        fields = "__all__"
        read_only_fields = (
            *CORE_READ_ONLY_FIELDS,
            "total_gross",
            "total_deductions",
            "total_net",
        )


class PayrollItemSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    legacy_input_aliases = PAYROLL_ITEM_ALIASES
    employee_name = serializers.CharField(source="employee.name", read_only=True)

    class Meta:
        model = PayrollItem
        fields = "__all__"
        read_only_fields = (
            *CORE_READ_ONLY_FIELDS,
            "employee_name",
            "gross_pay",
            "net_pay",
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
    "assiduidade": AttendanceRecordSerializer,
    "licenca": LeavePermissionSerializer,
    "saldo_ferias": VacationBalanceSerializer,
    "contrato": ContractSerializer,
    "documento_funcionario": EmployeeDocumentSerializer,
    "historico_salarial": SalaryHistorySerializer,
    "folha_run": PayrollRunSerializer,
    "folha_item": PayrollItemSerializer,
}
