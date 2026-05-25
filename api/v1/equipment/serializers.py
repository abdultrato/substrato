from rest_framework import serializers  # DRF base

from api.v1.compat import LegacyAliasSerializerMixin
from apps.equipment.models.equipment import Equipment
from apps.incidents.models.incident import Incident
from apps.inspections.models.daily_inspection import DailyInspection
from apps.maintenance.models.maintenance import Maintenance

CORE_READ_ONLY_FIELDS = [
    "id",
    "custom_id",
    "tenant",
    "created_by",
    "updated_by",
    "created_at",
    "updated_at",
    "deleted",
    "deleted_at",
    "deleted_by",
    "version",
]


EQUIPMENT_ALIASES = {
    "id_custom": "custom_id",
    "nome": "name",
    "serial": "serial_number",
    "numero_serie": "serial_number",
    "número_série": "serial_number",
    "número_serie": "serial_number",
    "numero de serie": "serial_number",
    "número de série": "serial_number",
    "data_aquisicao": "acquisition_date",
    "data_aquisição": "acquisition_date",
    "data de aquisição": "acquisition_date",
    "estado_aquisicao": "acquisition_status",
    "estado_aquisição": "acquisition_status",
    "estado de aquisição": "acquisition_status",
    "estado_operacional": "initial_operational_status",
    "estado operacional": "initial_operational_status",
    "estado_operacional_inicial": "initial_operational_status",
    "estado operacional inicial": "initial_operational_status",
    "avaria_inicial": "initial_failure_type",
    "tipo_avaria_inicial": "initial_failure_type",
    "tipo de avaria inicial": "initial_failure_type",
    "fabricante": "manufacturer",
    "modelo": "model",
    "local": "location",
    "localizacao": "location",
    "localização": "location",
    "responsavel": "responsible",
    "responsável": "responsible",
    "ativo": "active",
    "estado_atual": "current_status",
    "estado_actual": "current_status",
    "estado_atual_label": "current_status_label",
    "estado_actual_label": "current_status_label",
    "ultima_inspecao": "last_inspection",
    "última_inspeção": "last_inspection",
    "requer_manutencao": "requires_maintenance",
    "requer_manutenção": "requires_maintenance",
    "manutencao_requerida_desde": "maintenance_required_since",
    "manutenção_requerida_desde": "maintenance_required_since",
}

INSPECTION_ALIASES = {
    "id_custom": "custom_id",
    "equipamento": "equipment",
    "data": "date",
    "data_inspecao": "date",
    "data_inspeção": "date",
    "inspection_date": "date",
    "funcionamento": "operation_status",
    "estado_funcionamento": "operation_status",
    "estado de funcionamento": "operation_status",
    "estado_operacional": "operation_status",
    "operation": "operation_status",
    "operational_status": "operation_status",
    "status_operacional": "operation_status",
    "limpeza": "cleaning_performed",
    "cleaning": "cleaning_performed",
    "cleaned": "cleaning_performed",
    "higienizacao": "cleaning_performed",
    "higienização": "cleaning_performed",
    "limpeza_realizada": "cleaning_performed",
    "avaliacao": "assessment",
    "avaliação": "assessment",
    "achados": "assessment",
    "findings": "assessment",
    "assessment_notes": "assessment",
    "observacoes": "notes",
    "observações": "notes",
    "notas": "notes",
    "remarks": "notes",
}

MAINTENANCE_ALIASES = {
    "id_custom": "custom_id",
    "ocorrencia": "incident",
    "ocorrência": "incident",
    "pedido_manutencao": "incident",
    "pedido_manutenção": "incident",
    "equipamento": "equipment",
    "tipo": "type",
    "recorrencia": "type",
    "recorrência": "type",
    "tipo_manutencao": "maintenance_type",
    "tipo_manutenção": "maintenance_type",
    "natureza": "maintenance_type",
    "agendada_para": "scheduled_date",
    "programada_para": "scheduled_date",
    "data_programada": "scheduled_date",
    "data_agendada": "scheduled_date",
    "realizada_em": "performed_date",
    "executada_em": "performed_date",
    "data_realizacao": "performed_date",
    "data_realização": "performed_date",
    "descricao": "description",
    "descrição": "description",
    "detalhes": "description",
    "tecnico": "technician",
    "técnico": "technician",
}

INCIDENT_ALIASES = {
    "id_custom": "custom_id",
    "equipamento": "equipment",
    "data": "date",
    "data_ocorrencia": "date",
    "data_ocorrência": "date",
    "tipo": "type",
    "descricao": "description",
    "descrição": "description",
    "detalhes": "description",
    "contacto_suporte": "support_contact",
    "contato_suporte": "support_contact",
    "contacto_assistencia": "support_contact",
    "contacto_assistência": "support_contact",
    "suporte": "support_contact",
    "acoes_pos_ocorrencia": "post_incident_actions",
    "ações_pós_ocorrência": "post_incident_actions",
    "acoes_apos_ocorrencia": "post_incident_actions",
    "ações_após_ocorrência": "post_incident_actions",
    "requer_manutencao": "requires_maintenance",
    "requer_manutenção": "requires_maintenance",
    "pedido_manutencao_em": "maintenance_requested_at",
    "pedido_manutenção_em": "maintenance_requested_at",
    "manutencao_concluida_em": "maintenance_completed_at",
    "manutenção_concluída_em": "maintenance_completed_at",
    "resolvido": "resolved",
    "resolvida": "resolved",
}


def _get_last_inspection(obj: Equipment):
    if hasattr(obj, "_last_inspection_cache"):
        return obj._last_inspection_cache
    last_inspection = obj.last_inspection()
    obj._last_inspection_cache = last_inspection
    return last_inspection


class EquipmentSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    legacy_input_aliases = EQUIPMENT_ALIASES
    legacy_output_aliases = EQUIPMENT_ALIASES
    status = serializers.SerializerMethodField()
    current_status = serializers.SerializerMethodField()
    current_status_label = serializers.SerializerMethodField()
    last_inspection = serializers.SerializerMethodField()

    def get_status(self, obj: Equipment) -> str:
        return obj.current_status_label or obj.current_status or ""

    def get_current_status(self, obj: Equipment) -> str:
        return obj.current_status

    def get_current_status_label(self, obj: Equipment) -> str:
        return obj.current_status_label

    def get_last_inspection(self, obj: Equipment):
        last_inspection = _get_last_inspection(obj)
        return last_inspection.date if last_inspection else None

    class Meta:
        model = Equipment
        fields = "__all__"
        read_only_fields = [
            *CORE_READ_ONLY_FIELDS,
            "status",
            "current_status",
            "current_status_label",
            "last_inspection",
            "requires_maintenance",
            "maintenance_required_since",
        ]
        extra_kwargs = {
            "name": {"required": True},
            "serial_number": {"required": True},
        }


class DailyInspectionSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    legacy_input_aliases = INSPECTION_ALIASES
    legacy_output_aliases = INSPECTION_ALIASES
    description = serializers.SerializerMethodField(method_name="get_description")
    status = serializers.SerializerMethodField()

    def get_description(self, obj: DailyInspection) -> str:
        equipment = getattr(obj, "equipment", None)
        if equipment:
            name = equipment.name or equipment.serial_number or f"Equipamento {equipment.pk}"
            return f"{name} - {obj.date}"
        return str(obj.date)

    def get_status(self, obj: DailyInspection) -> str:
        try:
            return obj.get_operation_status_display()
        except Exception:
            return obj.operation_status or ""

    class Meta:
        model = DailyInspection
        fields = "__all__"
        read_only_fields = [*CORE_READ_ONLY_FIELDS, "description", "status"]


class MaintenanceSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    legacy_input_aliases = MAINTENANCE_ALIASES
    legacy_output_aliases = MAINTENANCE_ALIASES
    status = serializers.SerializerMethodField()
    maintenance_type_display = serializers.CharField(source="get_maintenance_type_display", read_only=True)
    equipment_name = serializers.SerializerMethodField()
    incident_code = serializers.SerializerMethodField()
    incident_context = serializers.SerializerMethodField()

    def get_status(self, obj: Maintenance) -> str:
        return "Executada" if obj.performed else "Programada"

    def get_equipment_name(self, obj: Maintenance) -> str:
        equipment = getattr(obj, "equipment", None)
        return getattr(equipment, "name", "") or getattr(equipment, "serial_number", "") or ""

    def get_incident_code(self, obj: Maintenance) -> str:
        incident = getattr(obj, "incident", None)
        return getattr(incident, "custom_id", "") or ""

    def get_incident_context(self, obj: Maintenance):
        incident = getattr(obj, "incident", None)
        if not incident:
            return None
        return {
            "id": incident.id,
            "custom_id": incident.custom_id,
            "date": incident.date,
            "type": incident.type,
            "description": incident.description,
            "support_contact": incident.support_contact,
            "post_incident_actions": incident.post_incident_actions,
            "maintenance_status": incident.maintenance_status,
        }

    def validate(self, attrs):
        attrs = super().validate(attrs)
        incident = attrs.get("incident") or getattr(self.instance, "incident", None)
        equipment = attrs.get("equipment") or getattr(self.instance, "equipment", None)

        if incident and not equipment:
            attrs["equipment"] = incident.equipment
        elif incident and equipment and incident.equipment_id != equipment.id:
            raise serializers.ValidationError(
                {"incident": "A ocorrência deve pertencer ao equipamento da manutenção."}
            )
        elif not incident and not equipment:
            raise serializers.ValidationError({"equipment": "Informe o equipamento da manutenção."})

        return attrs

    class Meta:
        model = Maintenance
        fields = "__all__"
        read_only_fields = [
            *CORE_READ_ONLY_FIELDS,
            "status",
            "maintenance_type_display",
            "equipment_name",
            "incident_code",
            "incident_context",
        ]
        extra_kwargs = {
            "equipment": {"required": False},
            "maintenance_type": {"required": True},
        }


class IncidentSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    legacy_input_aliases = INCIDENT_ALIASES
    legacy_output_aliases = INCIDENT_ALIASES
    status = serializers.SerializerMethodField()  # Rótulo legível
    equipment_name = serializers.SerializerMethodField()
    equipment_serial_number = serializers.SerializerMethodField()
    maintenance_status = serializers.SerializerMethodField()
    maintenance_count = serializers.SerializerMethodField()
    latest_maintenance = serializers.SerializerMethodField()

    def get_status(self, obj: Incident) -> str:
        return "Resolvida" if obj.resolved else "Pendente"

    def get_equipment_name(self, obj: Incident) -> str:
        equipment = getattr(obj, "equipment", None)
        return getattr(equipment, "name", "") or getattr(equipment, "serial_number", "") or ""

    def get_equipment_serial_number(self, obj: Incident) -> str:
        equipment = getattr(obj, "equipment", None)
        return getattr(equipment, "serial_number", "") or ""

    def get_maintenance_status(self, obj: Incident) -> str:
        return obj.maintenance_status

    def get_maintenance_count(self, obj: Incident) -> int:
        return obj.maintenances.count()

    def get_latest_maintenance(self, obj: Incident):
        maintenance = obj.maintenances.order_by("-performed_date", "-scheduled_date", "-created_at").first()
        if not maintenance:
            return None
        return {
            "id": maintenance.id,
            "custom_id": maintenance.custom_id,
            "maintenance_type": maintenance.maintenance_type,
            "scheduled_date": maintenance.scheduled_date,
            "performed_date": maintenance.performed_date,
            "technician": maintenance.technician,
            "description": maintenance.description,
        }

    class Meta:
        model = Incident
        fields = "__all__"
        read_only_fields = [
            *CORE_READ_ONLY_FIELDS,
            "status",
            "equipment_name",
            "equipment_serial_number",
            "maintenance_status",
            "maintenance_count",
            "latest_maintenance",
        ]


SERIALIZER_MAP = {
    "equipment": EquipmentSerializer,
    "daily_inspection": DailyInspectionSerializer,
    "maintenance": MaintenanceSerializer,
    "incident": IncidentSerializer,
    "inspecaodiaria": DailyInspectionSerializer,
    "manutencao": MaintenanceSerializer,
    "ocorrencia": IncidentSerializer,
}
