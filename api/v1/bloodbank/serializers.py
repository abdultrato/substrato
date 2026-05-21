from rest_framework import serializers

from api.v1.compat import LegacyAliasSerializerMixin
from apps.bloodbank.models.blood_bank import (
    BloodDonation,
    BloodStockMovement,
    BloodStorage,
    BloodStorageMaintenance,
    BloodTransfusion,
    BloodUnit,
)

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

BLOOD_DONATION_LEGACY_ALIASES = {
    "altura": "donor_height_cm",
    "altura_cm": "donor_height_cm",
    "bolsa": "bag_identifier",
    "coleta": "collected_at",
    "colheita": "collected_at",
    "colhido_em": "collected_at",
    "coletado_em": "collected_at",
    "coletado_por": "collected_by",
    "colhido_por": "collected_by",
    "contraindicacoes": "contraindications",
    "contraindicações": "contraindications",
    "doador": "donor",
    "estado": "status",
    "estado_doacao": "status",
    "estado_doação": "status",
    "estado_triagem": "screening_status",
    "hepatite_b": "hepatitis_b_hbsag_test",
    "hepatite_c": "hepatitis_c_anti_hcv_test",
    "hemoglobina": "hemoglobin_g_dl",
    "identificador_bolsa": "bag_identifier",
    "malaria": "malaria_test",
    "malária": "malaria_test",
    "observacoes": "notes",
    "observações": "notes",
    "observacoes_exames": "test_notes",
    "observações_exames": "test_notes",
    "peso": "donor_weight_kg",
    "peso_kg": "donor_weight_kg",
    "pressao_diastolica": "blood_pressure_diastolic",
    "pressão_diastólica": "blood_pressure_diastolic",
    "pressao_sistolica": "blood_pressure_systolic",
    "pressão_sistólica": "blood_pressure_systolic",
    "processado_em": "processed_at",
    "pulso": "pulse_bpm",
    "reposicao_para": "replacement_for",
    "reposição_para": "replacement_for",
    "paciente_reposicao": "replacement_for",
    "paciente_reposição": "replacement_for",
    "sifilis": "syphilis_rpr_test",
    "sífilis": "syphilis_rpr_test",
    "temperatura": "temperature_c",
    "tipo_de_doador": "donor_role",
    "tipo_doador": "donor_role",
    "tipo_doacao": "donation_type",
    "tipo_doação": "donation_type",
    "tipo_sanguineo": "blood_type",
    "tipo_sanguíneo": "blood_type",
    "triagem": "screening_status",
    "volume": "volume_ml",
    "volume_ml": "volume_ml",
}

BLOOD_STORAGE_LEGACY_ALIASES = {
    "ativo": "is_active",
    "capacidade": "capacity_units",
    "capacidade_unidades": "capacity_units",
    "local": "location",
    "localizacao": "location",
    "localização": "location",
    "nome": "name",
    "observacoes": "notes",
    "observações": "notes",
    "temperatura_maxima": "temperature_max_c",
    "temperatura_máxima": "temperature_max_c",
    "temperatura_minima": "temperature_min_c",
    "temperatura_mínima": "temperature_min_c",
    "ultima_validacao": "last_validation_at",
    "última_validação": "last_validation_at",
}

BLOOD_UNIT_LEGACY_ALIASES = {
    "armazenamento": "storage",
    "aviada_em": "forwarded_at",
    "aviada_por": "forwarded_by",
    "coleta": "collected_at",
    "colheita": "collected_at",
    "componente": "component_type",
    "desfecho": "dispatch_outcome",
    "desfecho_aviacao": "dispatch_outcome",
    "desfecho_aviação": "dispatch_outcome",
    "doacao": "donation",
    "doação": "donation",
    "estado": "status",
    "irradiada": "is_irradiated",
    "numero_unidade": "unit_number",
    "número_unidade": "unit_number",
    "observacoes": "notes",
    "observações": "notes",
    "observacoes_desfecho": "dispatch_outcome_notes",
    "observações_desfecho": "dispatch_outcome_notes",
    "paciente_reservado": "reserved_for",
    "reservado_para": "reserved_for",
    "setor": "forwarded_to_sector",
    "setor_aviacao": "forwarded_to_sector",
    "setor_aviação": "forwarded_to_sector",
    "tipo_componente": "component_type",
    "tipo_sanguineo": "blood_type",
    "tipo_sanguíneo": "blood_type",
    "unidade": "unit_number",
    "validade": "expires_at",
    "volume": "volume_ml",
    "volume_ml": "volume_ml",
}

BLOOD_TRANSFUSION_LEGACY_ALIASES = {
    "estado": "status",
    "executado_por": "performed_by",
    "finalizado_em": "finished_at",
    "fim": "finished_at",
    "indicacao": "indication",
    "indicação": "indication",
    "inicio": "started_at",
    "início": "started_at",
    "observacoes": "notes",
    "observações": "notes",
    "paciente": "recipient",
    "reacao": "reaction_notes",
    "reação": "reaction_notes",
    "receptor": "recipient",
    "solicitado_em": "requested_at",
    "solicitado_por": "requested_by",
    "unidade": "blood_unit",
    "unidade_sangue": "blood_unit",
}

BLOOD_STOCK_MOVEMENT_LEGACY_ALIASES = {
    "armazenamento_destino": "destination_storage",
    "armazenamento_origem": "source_storage",
    "destino": "destination_storage",
    "executado_por": "performed_by",
    "motivo": "reason",
    "movido_em": "moved_at",
    "observacoes": "notes",
    "observações": "notes",
    "origem": "source_storage",
    "tipo": "movement_type",
    "tipo_movimento": "movement_type",
    "unidade": "unit",
}

BLOOD_STORAGE_MAINTENANCE_LEGACY_ALIASES = {
    "acoes_executadas": "actions_taken",
    "ações_executadas": "actions_taken",
    "achados": "findings",
    "agendada_em": "scheduled_at",
    "armazenamento": "storage",
    "estado": "status",
    "executada_em": "performed_at",
    "observacoes": "notes",
    "observações": "notes",
    "proxima_manutencao": "next_due_at",
    "próxima_manutenção": "next_due_at",
    "tecnico": "technician_name",
    "técnico": "technician_name",
    "tipo": "maintenance_type",
    "tipo_manutencao": "maintenance_type",
    "tipo_manutenção": "maintenance_type",
}


class BloodDonationSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    legacy_input_aliases = BLOOD_DONATION_LEGACY_ALIASES
    legacy_output_aliases = BLOOD_DONATION_LEGACY_ALIASES

    class Meta:
        model = BloodDonation
        fields = "__all__"
        read_only_fields = CORE_READ_ONLY_FIELDS


class BloodStorageSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    legacy_input_aliases = BLOOD_STORAGE_LEGACY_ALIASES
    legacy_output_aliases = BLOOD_STORAGE_LEGACY_ALIASES

    class Meta:
        model = BloodStorage
        fields = "__all__"
        read_only_fields = CORE_READ_ONLY_FIELDS


class BloodUnitSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    legacy_input_aliases = BLOOD_UNIT_LEGACY_ALIASES
    legacy_output_aliases = BLOOD_UNIT_LEGACY_ALIASES

    class Meta:
        model = BloodUnit
        fields = "__all__"
        read_only_fields = CORE_READ_ONLY_FIELDS


class BloodTransfusionSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    legacy_input_aliases = BLOOD_TRANSFUSION_LEGACY_ALIASES
    legacy_output_aliases = BLOOD_TRANSFUSION_LEGACY_ALIASES

    class Meta:
        model = BloodTransfusion
        fields = "__all__"
        read_only_fields = CORE_READ_ONLY_FIELDS


class BloodStockMovementSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    legacy_input_aliases = BLOOD_STOCK_MOVEMENT_LEGACY_ALIASES
    legacy_output_aliases = BLOOD_STOCK_MOVEMENT_LEGACY_ALIASES

    class Meta:
        model = BloodStockMovement
        fields = "__all__"
        read_only_fields = CORE_READ_ONLY_FIELDS


class BloodStorageMaintenanceSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    legacy_input_aliases = BLOOD_STORAGE_MAINTENANCE_LEGACY_ALIASES
    legacy_output_aliases = BLOOD_STORAGE_MAINTENANCE_LEGACY_ALIASES

    class Meta:
        model = BloodStorageMaintenance
        fields = "__all__"
        read_only_fields = CORE_READ_ONLY_FIELDS


SERIALIZER_MAP = {
    "doacao": BloodDonationSerializer,
    "armazenamento": BloodStorageSerializer,
    "unidade": BloodUnitSerializer,
    "transfusao": BloodTransfusionSerializer,
    "movimentoestoque": BloodStockMovementSerializer,
    "manutencaoarmazenamento": BloodStorageMaintenanceSerializer,
}

