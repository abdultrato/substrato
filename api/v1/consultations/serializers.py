from rest_framework import serializers

from apps.billing.models.credit_note_request import CreditNoteRequest
from apps.billing.models.invoice import Invoice
from apps.consultations.models.consultation_specialty import ConsultationSpecialty
from apps.consultations.models.holiday import Holiday
from apps.consultations.models.medical_consultation import MedicalConsultation
from apps.human_resources.models.employee import Employee

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

CONSULTATION_SPECIALTY_ALIASES = {
    "descricao": "description",
    "descrição": "description",
    "sector": "sector",
    "setor": "sector",
    "sector_clinico": "sector",
    "sector_clínico": "sector",
    "setor_clinico": "sector",
    "setor_clínico": "sector",
    "preco": "base_price",
    "preço": "base_price",
    "preco_base": "base_price",
    "preço_base": "base_price",
    "preco base": "base_price",
    "preço base": "base_price",
    "iva": "vat_percentage",
    "vat": "vat_percentage",
    "percentagem_iva": "vat_percentage",
    "percentagem iva": "vat_percentage",
    "ativo": "active",
    "ativa": "active",
}

MEDICAL_CONSULTATION_ALIASES = {
    "paciente": "patient",
    "doente": "patient",
    "especialidade": "specialty",
    "servico": "specialty",
    "serviço": "specialty",
    "medico": "doctor",
    "médico": "doctor",
    "agendada para": "scheduled_for",
    "marcada para": "scheduled_for",
    "data": "scheduled_for",
    "descricao": "description",
    "descrição": "description",
    "feriado manual": "manual_holiday",
    "feriado_manual": "manual_holiday",
    "manual holiday": "manual_holiday",
}


class DoctorSerializer(serializers.ModelSerializer):
    role_name = serializers.CharField(source="role.name", read_only=True)
    profession_name = serializers.CharField(source="profession.name", read_only=True)

    class Meta:
        model = Employee
        fields = ["id", "custom_id", "name", "profession", "profession_name", "role", "role_name"]


class MedicalConsultationSerializer(serializers.ModelSerializer):
    # Allow creating a consultation with `specialty`; the model syncs type/price.
    type = serializers.CharField(required=False, allow_blank=True)
    patient_name = serializers.CharField(source="patient.name", read_only=True)
    doctor_name = serializers.SerializerMethodField(method_name="get_doctor_name")
    created_by_name = serializers.SerializerMethodField(method_name="get_created_by_name")
    specialty_name = serializers.CharField(source="specialty.name", read_only=True)
    specialty_sector = serializers.CharField(source="specialty.sector", read_only=True)
    specialty_sector_display = serializers.CharField(source="specialty.get_sector_display", read_only=True)
    invoice_id = serializers.SerializerMethodField(method_name="get_invoice_id")
    invoice_code = serializers.SerializerMethodField(method_name="get_invoice_code")
    invoice_status = serializers.SerializerMethodField(method_name="get_invoice_status")
    invoice_origin = serializers.SerializerMethodField(method_name="get_invoice_origin")
    has_pending_credit_note_request = serializers.SerializerMethodField()
    legacy_input_aliases = MEDICAL_CONSULTATION_ALIASES

    class Meta:
        model = MedicalConsultation
        fields = "__all__"
        read_only_fields = (
            *CORE_READ_ONLY_FIELDS,
            "patient_name",
            "doctor_name",
            "created_by_name",
            "specialty_name",
            "specialty_sector",
            "specialty_sector_display",
            "invoice_id",
            "invoice_code",
            "invoice_status",
            "invoice_origin",
            "has_pending_credit_note_request",
            "schedule_type",
            "price_multiplier",
            "reschedule_count",
        )
        extra_kwargs = {
            "consultation_type": {"required": False},
        }

    def get_doctor_name(self, obj: MedicalConsultation) -> str:
        doctor = getattr(obj, "doctor", None)
        if not doctor:
            return ""
        return getattr(doctor, "name", "") or ""

    def get_created_by_name(self, obj: MedicalConsultation) -> str:
        user = getattr(obj, "created_by", None)
        if not user:
            return ""
        full_name = (getattr(user, "get_full_name", lambda: "")() or "").strip()
        return full_name or getattr(user, "username", "") or ""

    def _get_invoice(self, obj: MedicalConsultation) -> Invoice | None:
        try:
            return getattr(obj, "invoice", None)
        except Exception:
            return None

    def get_invoice_id(self, obj: MedicalConsultation) -> int | None:
        invoice = self._get_invoice(obj)
        return getattr(invoice, "id", None) if invoice else None

    def get_invoice_code(self, obj: MedicalConsultation) -> str:
        invoice = self._get_invoice(obj)
        return getattr(invoice, "custom_id", "") if invoice else ""

    def get_invoice_status(self, obj: MedicalConsultation) -> str:
        invoice = self._get_invoice(obj)
        return getattr(invoice, "status", "") if invoice else ""

    def get_invoice_origin(self, obj: MedicalConsultation) -> str:
        invoice = self._get_invoice(obj)
        return getattr(invoice, "origin", "") if invoice else ""

    def get_has_pending_credit_note_request(self, obj: MedicalConsultation) -> bool:
        invoice = self._get_invoice(obj)
        if invoice is None:
            return False
        return CreditNoteRequest.objects.filter(
            invoice=invoice,
            status=CreditNoteRequest.Status.PENDING,
            deleted=False,
        ).exists()

    def validate(self, attrs):
        attrs = super().validate(attrs)

        specialty = attrs.get("specialty") or getattr(self.instance, "specialty", None)

        type = (attrs.get("type") or getattr(self.instance, "type", "") or "").strip()
        if specialty and not type:
            attrs["type"] = (getattr(specialty, "name", "") or "").strip()
            type = (attrs.get("type") or "").strip()

        if not specialty and not type:
            raise serializers.ValidationError({"type": "Informe o type/name do serviço da consultation."})

        return attrs


class ConsultationSpecialtySerializer(serializers.ModelSerializer):
    sector_display = serializers.CharField(source="get_sector_display", read_only=True)
    legacy_input_aliases = CONSULTATION_SPECIALTY_ALIASES

    class Meta:
        model = ConsultationSpecialty
        fields = "__all__"
        read_only_fields = (*CORE_READ_ONLY_FIELDS, "sector_display")


class HolidaySerializer(serializers.ModelSerializer):
    class Meta:
        model = Holiday
        fields = "__all__"
        read_only_fields = CORE_READ_ONLY_FIELDS


class CreateConsultationInvoiceSerializer(serializers.Serializer):
    invoice_type = serializers.ChoiceField(
        choices=("draft", "issue", "proforma"),
        required=False,
    )
    issue = serializers.BooleanField(default=True, required=False)
    selected_items = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        allow_empty=True,
    )


class ConsultationInvoicePreviewItemSerializer(serializers.Serializer):
    key = serializers.CharField()
    category = serializers.CharField()
    item_type = serializers.CharField()
    item_type_label = serializers.CharField()
    source = serializers.CharField()
    source_code = serializers.CharField(allow_blank=True)
    description = serializers.CharField()
    quantity = serializers.CharField()
    unit_price = serializers.CharField()
    subtotal = serializers.CharField()
    vat_percentage = serializers.CharField()
    vat_amount = serializers.CharField()
    total = serializers.CharField()
    selected = serializers.BooleanField()


class ConsultationInvoicePreviewSerializer(serializers.Serializer):
    consultation_id = serializers.IntegerField()
    consultation_code = serializers.CharField()
    patient_name = serializers.CharField()
    entry_date = serializers.DateField()
    items = ConsultationInvoicePreviewItemSerializer(many=True)
    subtotal = serializers.CharField()
    vat_amount = serializers.CharField()
    total = serializers.CharField()


class CreateConsultationInvoiceResponseSerializer(serializers.Serializer):
    consultation_id = serializers.IntegerField()
    invoice_id = serializers.IntegerField()
    invoice_code = serializers.CharField()
    invoice_status = serializers.CharField()
    invoice_origin = serializers.CharField()
    total = serializers.CharField()
    items = ConsultationInvoicePreviewItemSerializer(many=True, required=False)


class ConsultationPricePreviewSerializer(serializers.Serializer):
    specialty = serializers.IntegerField()
    specialty_name = serializers.CharField()
    base_price = serializers.CharField()
    manual_holiday = serializers.BooleanField()
    is_holiday = serializers.BooleanField()
    schedule_type = serializers.CharField()
    price_multiplier = serializers.CharField()
    price_final = serializers.CharField()
    vat_percentage = serializers.CharField()
    vat_amount = serializers.CharField()
    price_with_vat = serializers.CharField()
    currency = serializers.CharField()


class RescheduleConsultationSerializer(serializers.Serializer):
    scheduled_for = serializers.DateTimeField()


class CancelConsultationSerializer(serializers.Serializer):
    reason = serializers.CharField(required=False, allow_blank=True, max_length=255)


SERIALIZER_MAP = {
    "consultation": MedicalConsultationSerializer,
    "doctors": DoctorSerializer,
    "specialty": ConsultationSpecialtySerializer,
    "holiday": HolidaySerializer,
}
