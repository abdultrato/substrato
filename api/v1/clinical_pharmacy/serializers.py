from rest_framework import serializers

from api.v1.compat import LegacyAliasSerializerMixin
from apps.clinical_pharmacy.models import (
    AntibioticStewardshipReview,
    ClinicalPharmacyIngredient,
    ClinicalPharmacyIVPreparation,
    ControlledSubstanceMovement,
    DrugInteractionRule,
    MedicationInteractionCheck,
)

CORE_READ_ONLY_FIELDS = (
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
)

BASE_ALIASES = {
    "id_custom": "custom_id",
    "nome": "name",
    "codigo": "code",
    "código": "code",
    "estado": "status",
    "situacao": "status",
    "situação": "status",
    "observacoes": "notes",
    "observações": "notes",
    "notas": "notes",
    "paciente": "patient",
    "produto": "product",
    "lote": "lot",
    "quantidade": "quantity",
    "unidade": "unit",
}


class ClinicalPharmacyIVPreparationSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    patient_name = serializers.CharField(source="patient.name", read_only=True)
    product_name = serializers.CharField(source="product.name", read_only=True)
    lot_number = serializers.CharField(source="lot.lot_number", read_only=True)
    pharmacist_name = serializers.CharField(source="pharmacist.name", read_only=True)
    ingredient_count = serializers.IntegerField(source="ingredients.count", read_only=True)
    controlled_movement_count = serializers.IntegerField(source="controlled_substance_movements.count", read_only=True)
    legacy_input_aliases = {
        **BASE_ALIASES,
        "prescricao_item": "prescription_item",
        "prescrição_item": "prescription_item",
        "item_prescricao": "prescription_item",
        "item_prescrição": "prescription_item",
        "farmaceutico": "pharmacist",
        "farmacêutico": "pharmacist",
        "verificador": "verifier",
        "preparado_por": "prepared_by",
        "tipo_preparacao": "preparation_type",
        "tipo_preparação": "preparation_type",
        "prioridade": "priority",
        "solicitada_em": "requested_at",
        "agendada_para": "scheduled_at",
        "verificada_em": "verified_at",
        "preparada_em": "prepared_at",
        "dispensada_em": "dispensed_at",
        "expira_em": "expires_at",
        "dose": "dose_value",
        "unidade_dose": "dose_unit",
        "volume_final_ml": "final_volume_ml",
        "via": "route",
        "diluente": "diluent",
        "recipiente": "container_type",
        "duracao_infusao_minutos": "infusion_duration_minutes",
        "duração_infusão_minutos": "infusion_duration_minutes",
        "protocolo": "protocol_reference",
        "esterilidade_aprovada": "sterility_check_passed",
        "compatibilidade_aprovada": "compatibility_check_passed",
        "medicamento_perigoso": "hazardous_drug",
        "validade_pos_preparo_horas": "beyond_use_hours",
        "validade_pós_preparo_horas": "beyond_use_hours",
        "motivo_rejeicao": "rejection_reason",
        "motivo_rejeição": "rejection_reason",
    }
    legacy_output_aliases = legacy_input_aliases

    class Meta:
        model = ClinicalPharmacyIVPreparation
        fields = "__all__"
        read_only_fields = (
            *CORE_READ_ONLY_FIELDS,
            "patient_name",
            "product_name",
            "lot_number",
            "pharmacist_name",
            "ingredient_count",
            "controlled_movement_count",
        )


class ClinicalPharmacyIngredientSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    preparation_label = serializers.CharField(source="preparation.custom_id", read_only=True)
    product_name = serializers.CharField(source="product.name", read_only=True)
    lot_number = serializers.CharField(source="lot.lot_number", read_only=True)
    patient_name = serializers.CharField(source="preparation.patient.name", read_only=True)
    legacy_input_aliases = {
        **BASE_ALIASES,
        "preparacao": "preparation",
        "preparação": "preparation",
        "funcao": "role",
        "função": "role",
        "quantidade_valor": "quantity_value",
        "quantidade_unidade": "quantity_unit",
        "concentracao": "concentration",
        "concentração": "concentration",
        "substancia_controlada": "controlled_substance",
        "substância_controlada": "controlled_substance",
        "perigoso": "hazardous",
    }
    legacy_output_aliases = legacy_input_aliases

    class Meta:
        model = ClinicalPharmacyIngredient
        fields = "__all__"
        read_only_fields = (*CORE_READ_ONLY_FIELDS, "preparation_label", "product_name", "lot_number", "patient_name")


class DrugInteractionRuleSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    primary_drug_name = serializers.CharField(source="primary_drug.name", read_only=True)
    interacting_drug_name = serializers.CharField(source="interacting_drug.name", read_only=True)
    legacy_input_aliases = {
        **BASE_ALIASES,
        "medicamento_primario": "primary_drug",
        "medicamento_primário": "primary_drug",
        "medicamento_interagente": "interacting_drug",
        "gravidade": "severity",
        "mecanismo": "mechanism",
        "efeito_clinico": "clinical_effect",
        "efeito_clínico": "clinical_effect",
        "recomendacao": "recommendation",
        "recomendação": "recommendation",
        "ativo": "active",
        "activa": "active",
    }
    legacy_output_aliases = legacy_input_aliases

    class Meta:
        model = DrugInteractionRule
        fields = "__all__"
        read_only_fields = (*CORE_READ_ONLY_FIELDS, "primary_drug_name", "interacting_drug_name")


class MedicationInteractionCheckSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    patient_name = serializers.CharField(source="patient.name", read_only=True)
    primary_drug_name = serializers.CharField(source="primary_drug.name", read_only=True)
    interacting_drug_name = serializers.CharField(source="interacting_drug.name", read_only=True)
    pharmacist_name = serializers.CharField(source="pharmacist.name", read_only=True)
    legacy_input_aliases = {
        **BASE_ALIASES,
        "prescricao_item": "prescription_item",
        "prescrição_item": "prescription_item",
        "medicamento_primario": "primary_drug",
        "medicamento_primário": "primary_drug",
        "medicamento_interagente": "interacting_drug",
        "regra": "rule",
        "gravidade": "severity",
        "verificada_em": "checked_at",
        "farmaceutico": "pharmacist",
        "farmacêutico": "pharmacist",
        "contexto_clinico": "clinical_context",
        "contexto_clínico": "clinical_context",
        "recomendacao": "recommendation",
        "recomendação": "recommendation",
        "conduta": "action_taken",
        "justificacao": "override_reason",
        "justificação": "override_reason",
    }
    legacy_output_aliases = legacy_input_aliases

    class Meta:
        model = MedicationInteractionCheck
        fields = "__all__"
        read_only_fields = (*CORE_READ_ONLY_FIELDS, "patient_name", "primary_drug_name", "interacting_drug_name", "pharmacist_name")
        extra_kwargs = {"primary_drug": {"required": False}}


class ControlledSubstanceMovementSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)
    lot_number = serializers.CharField(source="lot.lot_number", read_only=True)
    patient_name = serializers.CharField(source="patient.name", read_only=True)
    preparation_label = serializers.CharField(source="preparation.custom_id", read_only=True)
    responsible_name = serializers.CharField(source="responsible.name", read_only=True)
    witness_name = serializers.CharField(source="witness.name", read_only=True)
    legacy_input_aliases = {
        **BASE_ALIASES,
        "prescricao_item": "prescription_item",
        "prescrição_item": "prescription_item",
        "preparacao": "preparation",
        "preparação": "preparation",
        "tipo_movimento": "movement_type",
        "lista": "schedule",
        "movimentado_em": "movement_at",
        "responsavel": "responsible",
        "responsável": "responsible",
        "testemunha": "witness",
        "origem": "source",
        "destino": "destination",
        "motivo": "reason",
        "saldo": "running_balance",
        "codigo_custodia": "chain_of_custody_code",
        "código_custódia": "chain_of_custody_code",
    }
    legacy_output_aliases = legacy_input_aliases

    class Meta:
        model = ControlledSubstanceMovement
        fields = "__all__"
        read_only_fields = (
            *CORE_READ_ONLY_FIELDS,
            "running_balance",
            "product_name",
            "lot_number",
            "patient_name",
            "preparation_label",
            "responsible_name",
            "witness_name",
        )


class AntibioticStewardshipReviewSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    patient_name = serializers.CharField(source="patient.name", read_only=True)
    antibiotic_name = serializers.CharField(source="antibiotic.name", read_only=True)
    reviewer_name = serializers.CharField(source="reviewer.name", read_only=True)
    legacy_input_aliases = {
        **BASE_ALIASES,
        "prescricao_item": "prescription_item",
        "prescrição_item": "prescription_item",
        "antibiotico": "antibiotic",
        "antibiótico": "antibiotic",
        "revisor": "reviewer",
        "tipo_terapia": "therapy_type",
        "indicacao": "indication",
        "indicação": "indication",
        "foco_infeccioso": "infection_site",
        "microrganismo": "organism",
        "resultado_cultura": "culture_result",
        "inicio": "start_date",
        "início": "start_date",
        "duracao_planeada_dias": "planned_duration_days",
        "duração_planeada_dias": "planned_duration_days",
        "revisao_ate": "review_due_date",
        "revisão_até": "review_due_date",
        "revista_em": "reviewed_at",
        "ajuste_renal": "renal_adjustment_required",
        "dose_otimizada": "dose_optimized",
        "descalonamento_recomendado": "deescalation_recommended",
        "motivo_escalonamento": "escalation_reason",
        "recomendacao": "recommendation",
        "recomendação": "recommendation",
        "conduta": "action_taken",
    }
    legacy_output_aliases = legacy_input_aliases

    class Meta:
        model = AntibioticStewardshipReview
        fields = "__all__"
        read_only_fields = (*CORE_READ_ONLY_FIELDS, "patient_name", "antibiotic_name", "reviewer_name")
        extra_kwargs = {"antibiotic": {"required": False}}


SERIALIZER_MAP = {
    "preparation": ClinicalPharmacyIVPreparationSerializer,
    "ingredient": ClinicalPharmacyIngredientSerializer,
    "interaction_rule": DrugInteractionRuleSerializer,
    "interaction_check": MedicationInteractionCheckSerializer,
    "controlled_movement": ControlledSubstanceMovementSerializer,
    "antibiotic_review": AntibioticStewardshipReviewSerializer,
}
