from rest_framework import serializers

from api.v1.compat import LegacyAliasSerializerMixin
from apps.public_health.models import (
    AdverseEventFollowingImmunization,
    ImmunizationRecord,
    PublicHealthNotification,
    VaccinationCampaign,
    VaccinationCampaignTarget,
    VaccineLot,
    VaccineProduct,
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
    "estado": "status",
    "situacao": "status",
    "situação": "status",
    "observacoes": "notes",
    "observações": "notes",
    "notas": "notes",
    "paciente": "patient",
    "vacina": "vaccine",
    "lote": "lot",
    "campanha": "campaign",
    "meta": "target_group",
    "profissional": "administered_by",
    "registo_imunizacao": "immunization_record",
    "registro_imunizacao": "immunization_record",
    "evento_adverso": "adverse_event",
}


class VaccineProductSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    lot_count = serializers.IntegerField(source="lots.count", read_only=True)
    legacy_input_aliases = {
        **BASE_ALIASES,
        "codigo": "code",
        "código": "code",
        "doenca": "disease",
        "doença": "disease",
        "tipo_vacina": "vaccine_type",
        "fabricante": "manufacturer",
        "volume_dose_ml": "dose_volume_ml",
        "doses_requeridas": "dose_count_required",
        "intervalo_reforco_dias": "booster_interval_days",
        "intervalo_reforço_dias": "booster_interval_days",
        "idade_minima_meses": "minimum_age_months",
        "idade_mínima_meses": "minimum_age_months",
        "idade_maxima_meses": "maximum_age_months",
        "idade_máxima_meses": "maximum_age_months",
        "cadeia_fria_min_c": "cold_chain_min_c",
        "cadeia_fria_max_c": "cold_chain_max_c",
        "codigo_oficial": "official_code",
        "código_oficial": "official_code",
        "ativo": "active",
    }
    legacy_output_aliases = legacy_input_aliases

    class Meta:
        model = VaccineProduct
        fields = "__all__"
        read_only_fields = (*CORE_READ_ONLY_FIELDS, "lot_count")


class VaccineLotSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    vaccine_name = serializers.CharField(source="vaccine.name", read_only=True)
    is_expired = serializers.BooleanField(read_only=True)
    legacy_input_aliases = {
        **BASE_ALIASES,
        "numero_lote": "lot_number",
        "número_lote": "lot_number",
        "codigo_lote_oficial": "official_batch_code",
        "código_lote_oficial": "official_batch_code",
        "validade": "expiration_date",
        "recebido_em": "received_at",
        "doses_recebidas": "doses_received",
        "doses_disponiveis": "doses_available",
        "doses_disponíveis": "doses_available",
        "doses_reservadas": "reserved_doses",
        "local_armazenamento": "storage_location",
        "temperatura_atual_c": "storage_temperature_c",
        "cadeia_fria": "cold_chain_status",
    }
    legacy_output_aliases = legacy_input_aliases

    class Meta:
        model = VaccineLot
        fields = "__all__"
        read_only_fields = (*CORE_READ_ONLY_FIELDS, "vaccine_name", "is_expired")


class VaccinationCampaignSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    vaccine_name = serializers.CharField(source="vaccine.name", read_only=True)
    manager_name = serializers.CharField(source="manager.name", read_only=True)
    administered_doses = serializers.IntegerField(read_only=True)
    coverage_percent = serializers.DecimalField(max_digits=5, decimal_places=2, read_only=True)
    legacy_input_aliases = {
        **BASE_ALIASES,
        "responsavel": "manager",
        "responsável": "manager",
        "tipo_campanha": "campaign_type",
        "regiao_alvo": "target_region",
        "região_alvo": "target_region",
        "idade_minima_alvo_meses": "target_age_min_months",
        "idade_mínima_alvo_meses": "target_age_min_months",
        "idade_maxima_alvo_meses": "target_age_max_months",
        "idade_máxima_alvo_meses": "target_age_max_months",
        "populacao_alvo": "target_population",
        "população_alvo": "target_population",
        "meta_doses": "target_doses",
        "inicio": "start_date",
        "início": "start_date",
        "fim": "end_date",
        "codigo_programa_oficial": "official_program_code",
        "código_programa_oficial": "official_program_code",
        "sistema_oficial": "official_system",
        "endpoint_notificacao": "notification_endpoint",
        "endpoint_notificação": "notification_endpoint",
    }
    legacy_output_aliases = legacy_input_aliases

    class Meta:
        model = VaccinationCampaign
        fields = "__all__"
        read_only_fields = (
            *CORE_READ_ONLY_FIELDS,
            "vaccine_name",
            "manager_name",
            "administered_doses",
            "coverage_percent",
        )


class VaccinationCampaignTargetSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    campaign_name = serializers.CharField(source="campaign.name", read_only=True)
    coverage_percent = serializers.DecimalField(max_digits=5, decimal_places=2, read_only=True)
    legacy_input_aliases = {
        **BASE_ALIASES,
        "regiao": "region",
        "região": "region",
        "distrito": "district",
        "idade_minima_meses": "age_min_months",
        "idade_mínima_meses": "age_min_months",
        "idade_maxima_meses": "age_max_months",
        "idade_máxima_meses": "age_max_months",
        "populacao_alvo": "target_population",
        "população_alvo": "target_population",
        "meta_doses": "target_doses",
        "doses_aplicadas": "administered_doses",
    }
    legacy_output_aliases = legacy_input_aliases

    class Meta:
        model = VaccinationCampaignTarget
        fields = "__all__"
        read_only_fields = (*CORE_READ_ONLY_FIELDS, "campaign_name", "coverage_percent")


class ImmunizationRecordSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    patient_name = serializers.CharField(source="patient.name", read_only=True)
    vaccine_name = serializers.CharField(source="vaccine.name", read_only=True)
    lot_number = serializers.CharField(source="lot.lot_number", read_only=True)
    campaign_name = serializers.CharField(source="campaign.name", read_only=True)
    target_group_label = serializers.CharField(source="target_group.custom_id", read_only=True)
    administered_by_name = serializers.CharField(source="administered_by.name", read_only=True)
    is_administered = serializers.BooleanField(read_only=True)
    legacy_input_aliases = {
        **BASE_ALIASES,
        "grupo_meta": "target_group",
        "aplicada_por": "administered_by",
        "origem": "source",
        "numero_dose": "dose_number",
        "número_dose": "dose_number",
        "aplicada_em": "administered_at",
        "proxima_dose": "next_due_date",
        "próxima_dose": "next_due_date",
        "proxima_reforco": "next_due_date",
        "próxima_reforço": "next_due_date",
        "via": "route",
        "local_anatomico": "body_site",
        "local_anatómico": "body_site",
        "consentimento_confirmado": "consent_confirmed",
        "motivo_contraindicacao": "contraindication_reason",
        "motivo_contraindicação": "contraindication_reason",
        "id_notificacao_oficial": "official_notification_id",
        "id_notificação_oficial": "official_notification_id",
    }
    legacy_output_aliases = legacy_input_aliases

    class Meta:
        model = ImmunizationRecord
        fields = "__all__"
        read_only_fields = (
            *CORE_READ_ONLY_FIELDS,
            "patient_name",
            "vaccine_name",
            "lot_number",
            "campaign_name",
            "target_group_label",
            "administered_by_name",
            "is_administered",
        )
        extra_kwargs = {"vaccine": {"required": False}}


class AdverseEventFollowingImmunizationSerializer(
    LegacyAliasSerializerMixin,
    serializers.ModelSerializer,
):
    patient_name = serializers.CharField(source="patient.name", read_only=True)
    vaccine_name = serializers.CharField(source="vaccine.name", read_only=True)
    lot_number = serializers.CharField(source="lot.lot_number", read_only=True)
    record_label = serializers.CharField(source="immunization_record.custom_id", read_only=True)
    reported_by_name = serializers.CharField(source="reported_by.name", read_only=True)
    investigated_by_name = serializers.CharField(source="investigated_by.name", read_only=True)
    legacy_input_aliases = {
        **BASE_ALIASES,
        "reportado_por": "reported_by",
        "investigado_por": "investigated_by",
        "gravidade": "severity",
        "inicio_sintomas": "onset_at",
        "início_sintomas": "onset_at",
        "reportado_em": "reported_at",
        "investigacao_ate": "investigation_due_at",
        "investigação_até": "investigation_due_at",
        "sintomas": "symptoms",
        "grave": "serious",
        "desfecho": "outcome",
        "avaliacao_causalidade": "causality_assessment",
        "avaliação_causalidade": "causality_assessment",
        "id_notificacao_oficial": "official_notification_id",
        "id_notificação_oficial": "official_notification_id",
    }
    legacy_output_aliases = legacy_input_aliases

    class Meta:
        model = AdverseEventFollowingImmunization
        fields = "__all__"
        read_only_fields = (
            *CORE_READ_ONLY_FIELDS,
            "patient_name",
            "vaccine_name",
            "lot_number",
            "record_label",
            "reported_by_name",
            "investigated_by_name",
        )
        extra_kwargs = {
            "patient": {"required": False},
            "vaccine": {"required": False},
            "lot": {"required": False},
        }


class PublicHealthNotificationSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    campaign_name = serializers.CharField(source="campaign.name", read_only=True)
    immunization_record_label = serializers.CharField(source="immunization_record.custom_id", read_only=True)
    adverse_event_label = serializers.CharField(source="adverse_event.custom_id", read_only=True)
    legacy_input_aliases = {
        **BASE_ALIASES,
        "sistema_oficial": "official_system",
        "tipo_evento": "event_type",
        "resposta": "response_payload",
        "referencia_externa": "external_reference",
        "referência_externa": "external_reference",
        "tentativas": "attempt_count",
        "ultima_tentativa": "last_attempt_at",
        "última_tentativa": "last_attempt_at",
        "proxima_tentativa": "next_retry_at",
        "próxima_tentativa": "next_retry_at",
        "enviado_em": "sent_at",
        "mensagem_erro": "error_message",
    }
    legacy_output_aliases = legacy_input_aliases

    class Meta:
        model = PublicHealthNotification
        fields = "__all__"
        read_only_fields = (
            *CORE_READ_ONLY_FIELDS,
            "campaign_name",
            "immunization_record_label",
            "adverse_event_label",
        )


class PublicHealthDashboardSummarySerializer(serializers.Serializer):
    vaccines = serializers.IntegerField()
    active_lots = serializers.IntegerField()
    active_campaigns = serializers.IntegerField()
    immunizations_30d = serializers.IntegerField()
    due_boosters = serializers.IntegerField()
    serious_aefi_open = serializers.IntegerField()
    pending_notifications = serializers.IntegerField()
    low_stock_lots = serializers.IntegerField()
    cold_chain_breaches = serializers.IntegerField()
    expired_lots = serializers.IntegerField()


class PublicHealthStockRiskSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    custom_id = serializers.CharField(allow_blank=True)
    vaccine_name = serializers.CharField(allow_blank=True)
    lot_number = serializers.CharField(allow_blank=True)
    status = serializers.CharField()
    expiration_date = serializers.DateField()
    doses_available = serializers.IntegerField()
    reserved_doses = serializers.IntegerField()
    cold_chain_status = serializers.CharField()
    storage_location = serializers.CharField(allow_blank=True)
    risk = serializers.CharField()


class PublicHealthCampaignProgressSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    custom_id = serializers.CharField(allow_blank=True)
    name = serializers.CharField()
    vaccine_name = serializers.CharField(allow_blank=True)
    status = serializers.CharField()
    target_region = serializers.CharField(allow_blank=True)
    start_date = serializers.DateField()
    end_date = serializers.DateField(allow_null=True)
    target_doses = serializers.IntegerField()
    administered_doses = serializers.IntegerField()
    coverage_percent = serializers.DecimalField(max_digits=5, decimal_places=2)


class PublicHealthBoosterDueSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    custom_id = serializers.CharField(allow_blank=True)
    patient_id = serializers.IntegerField()
    patient_name = serializers.CharField(allow_blank=True)
    vaccine_name = serializers.CharField(allow_blank=True)
    dose_number = serializers.IntegerField()
    administered_at = serializers.DateTimeField()
    next_due_date = serializers.DateField()
    days_overdue = serializers.IntegerField()


class PublicHealthAefiQueueSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    custom_id = serializers.CharField(allow_blank=True)
    patient_name = serializers.CharField(allow_blank=True)
    vaccine_name = serializers.CharField(allow_blank=True)
    severity = serializers.CharField()
    status = serializers.CharField()
    serious = serializers.BooleanField()
    reported_at = serializers.DateTimeField()
    investigation_due_at = serializers.DateTimeField(allow_null=True)


class PublicHealthNotificationQueueSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    custom_id = serializers.CharField(allow_blank=True)
    official_system = serializers.CharField()
    event_type = serializers.CharField()
    status = serializers.CharField()
    external_reference = serializers.CharField(allow_blank=True)
    attempt_count = serializers.IntegerField()
    next_retry_at = serializers.DateTimeField(allow_null=True)
    error_message = serializers.CharField(allow_blank=True)


class PublicHealthDashboardSerializer(serializers.Serializer):
    summary = PublicHealthDashboardSummarySerializer()
    stock_risks = PublicHealthStockRiskSerializer(many=True)
    campaign_progress = PublicHealthCampaignProgressSerializer(many=True)
    booster_queue = PublicHealthBoosterDueSerializer(many=True)
    aefi_queue = PublicHealthAefiQueueSerializer(many=True)
    notification_queue = PublicHealthNotificationQueueSerializer(many=True)


SERIALIZER_MAP = {
    "vaccine": VaccineProductSerializer,
    "lot": VaccineLotSerializer,
    "campaign": VaccinationCampaignSerializer,
    "target": VaccinationCampaignTargetSerializer,
    "immunization": ImmunizationRecordSerializer,
    "adverse_event": AdverseEventFollowingImmunizationSerializer,
    "notification": PublicHealthNotificationSerializer,
}
