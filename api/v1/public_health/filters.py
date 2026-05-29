from api.core.filters import SafeFilterSet
from apps.public_health.models import (
    AdverseEventFollowingImmunization,
    ImmunizationRecord,
    PublicHealthNotification,
    VaccinationCampaign,
    VaccinationCampaignTarget,
    VaccineLot,
    VaccineProduct,
)

BASE_FIELDS = [
    "tenant",
    "custom_id",
    "deleted",
    "deleted_at",
    "created_at",
    "updated_at",
    "created_by",
    "updated_by",
]


class VaccineProductFilter(SafeFilterSet):
    class Meta:
        model = VaccineProduct
        fields = [
            *BASE_FIELDS,
            "code",
            "disease",
            "vaccine_type",
            "official_code",
            "active",
        ]


class VaccineLotFilter(SafeFilterSet):
    class Meta:
        model = VaccineLot
        fields = [
            *BASE_FIELDS,
            "vaccine",
            "lot_number",
            "official_batch_code",
            "status",
            "expiration_date",
            "cold_chain_status",
        ]


class VaccinationCampaignFilter(SafeFilterSet):
    class Meta:
        model = VaccinationCampaign
        fields = [
            *BASE_FIELDS,
            "vaccine",
            "manager",
            "campaign_type",
            "status",
            "target_region",
            "start_date",
            "end_date",
            "official_program_code",
        ]


class VaccinationCampaignTargetFilter(SafeFilterSet):
    class Meta:
        model = VaccinationCampaignTarget
        fields = [
            *BASE_FIELDS,
            "campaign",
            "region",
            "district",
            "age_min_months",
            "age_max_months",
        ]


class ImmunizationRecordFilter(SafeFilterSet):
    class Meta:
        model = ImmunizationRecord
        fields = [
            *BASE_FIELDS,
            "patient",
            "vaccine",
            "lot",
            "campaign",
            "target_group",
            "administered_by",
            "status",
            "source",
            "dose_number",
            "administered_at",
            "next_due_date",
            "official_notification_id",
        ]


class AdverseEventFollowingImmunizationFilter(SafeFilterSet):
    class Meta:
        model = AdverseEventFollowingImmunization
        fields = [
            *BASE_FIELDS,
            "immunization_record",
            "patient",
            "vaccine",
            "lot",
            "reported_by",
            "investigated_by",
            "severity",
            "status",
            "serious",
            "outcome",
            "reported_at",
            "investigation_due_at",
            "official_notification_id",
        ]


class PublicHealthNotificationFilter(SafeFilterSet):
    class Meta:
        model = PublicHealthNotification
        fields = [
            *BASE_FIELDS,
            "official_system",
            "event_type",
            "status",
            "campaign",
            "immunization_record",
            "adverse_event",
            "external_reference",
            "last_attempt_at",
            "next_retry_at",
            "sent_at",
        ]


FILTER_MAP = {
    "vaccine": VaccineProductFilter,
    "lot": VaccineLotFilter,
    "campaign": VaccinationCampaignFilter,
    "target": VaccinationCampaignTargetFilter,
    "immunization": ImmunizationRecordFilter,
    "adverse_event": AdverseEventFollowingImmunizationFilter,
    "notification": PublicHealthNotificationFilter,
}
