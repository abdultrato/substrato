from rest_framework import serializers

from api.v1.compat import LegacyAliasSerializerMixin
from apps.veterinary.models import (
    VeterinaryAdmission,
    VeterinaryAnimal,
    VeterinaryAppointment,
    VeterinaryLabExam,
    VeterinaryLabRequest,
    VeterinaryLabRequestItem,
    VeterinaryMedicalRecord,
    VeterinaryPrescription,
    VeterinaryPrescriptionItem,
    VeterinaryVaccination,
    VeterinaryVaccine,
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
    "animal": "animal",
    "veterinario": "veterinarian",
    "veterinário": "veterinarian",
}


class VeterinaryAnimalSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    legacy_input_aliases = {
        **BASE_ALIASES,
        "especie": "species",
        "espécie": "species",
        "raca": "breed",
        "raça": "breed",
        "sexo": "sex",
        "data_nascimento": "birth_date",
        "cor": "color",
        "microchip": "microchip_number",
        "tutor": "owner_name",
        "responsavel": "owner_name",
        "responsável": "owner_name",
        "contacto_tutor": "owner_phone",
        "email_tutor": "owner_email",
        "alergias": "allergies",
    }
    legacy_output_aliases = legacy_input_aliases

    class Meta:
        model = VeterinaryAnimal
        fields = "__all__"
        read_only_fields = CORE_READ_ONLY_FIELDS


class VeterinaryAppointmentSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    legacy_input_aliases = {
        **BASE_ALIASES,
        "inicio_agendado": "scheduled_start",
        "fim_agendado": "scheduled_end",
        "motivo": "reason",
        "sala": "room",
        "triagem": "triage_notes",
    }
    legacy_output_aliases = legacy_input_aliases

    animal_name = serializers.CharField(source="animal.name", read_only=True)
    owner_name = serializers.CharField(source="animal.owner_name", read_only=True)
    veterinarian_name = serializers.CharField(source="veterinarian.name", read_only=True)

    class Meta:
        model = VeterinaryAppointment
        fields = "__all__"
        read_only_fields = (*CORE_READ_ONLY_FIELDS, "animal_name", "owner_name", "veterinarian_name")


class VeterinaryMedicalRecordSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    legacy_input_aliases = {
        **BASE_ALIASES,
        "consulta": "appointment",
        "aberto_em": "opened_at",
        "fechado_em": "closed_at",
        "peso_kg": "weight_kg",
        "temperatura_c": "temperature_c",
        "frequencia_cardiaca": "heart_rate_bpm",
        "frequência_cardíaca": "heart_rate_bpm",
        "frequencia_respiratoria": "respiratory_rate_bpm",
        "frequência_respiratória": "respiratory_rate_bpm",
        "anamnese": "anamnesis",
        "sintomas": "symptoms",
        "diagnostico": "diagnosis",
        "diagnóstico": "diagnosis",
        "plano_terapeutico": "treatment_plan",
        "plano_terapêutico": "treatment_plan",
        "notas_receita": "prescription_notes",
    }
    legacy_output_aliases = legacy_input_aliases

    animal_name = serializers.CharField(source="animal.name", read_only=True)
    owner_name = serializers.CharField(source="animal.owner_name", read_only=True)
    veterinarian_name = serializers.CharField(source="veterinarian.name", read_only=True)

    class Meta:
        model = VeterinaryMedicalRecord
        fields = "__all__"
        read_only_fields = (*CORE_READ_ONLY_FIELDS, "animal_name", "owner_name", "veterinarian_name")


class VeterinaryVaccineSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    legacy_input_aliases = {
        **BASE_ALIASES,
        "especie": "species",
        "espécie": "species",
        "doenca": "disease",
        "doença": "disease",
        "fabricante": "manufacturer",
        "intervalo_padrao_dias": "default_interval_days",
        "intervalo_padrão_dias": "default_interval_days",
        "ativo": "active",
    }
    legacy_output_aliases = legacy_input_aliases

    class Meta:
        model = VeterinaryVaccine
        fields = "__all__"
        read_only_fields = CORE_READ_ONLY_FIELDS


class VeterinaryVaccinationSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    legacy_input_aliases = {
        **BASE_ALIASES,
        "vacina": "vaccine",
        "agendada_para": "scheduled_for",
        "aplicada_em": "administered_at",
        "proxima_dose": "next_due_date",
        "próxima_dose": "next_due_date",
        "lote": "lot_number",
        "reacao_adversa": "adverse_reaction",
        "reação_adversa": "adverse_reaction",
    }
    legacy_output_aliases = legacy_input_aliases

    animal_name = serializers.CharField(source="animal.name", read_only=True)
    owner_name = serializers.CharField(source="animal.owner_name", read_only=True)
    vaccine_name = serializers.CharField(source="vaccine.name", read_only=True)
    veterinarian_name = serializers.CharField(source="veterinarian.name", read_only=True)

    class Meta:
        model = VeterinaryVaccination
        fields = "__all__"
        read_only_fields = (*CORE_READ_ONLY_FIELDS, "animal_name", "owner_name", "vaccine_name", "veterinarian_name")


class VeterinaryLabExamSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    legacy_input_aliases = {
        **BASE_ALIASES,
        "especie": "species",
        "espécie": "species",
        "tipo_amostra": "sample_type",
        "prazo_horas": "turnaround_hours",
        "ativo": "active",
    }
    legacy_output_aliases = legacy_input_aliases

    class Meta:
        model = VeterinaryLabExam
        fields = "__all__"
        read_only_fields = CORE_READ_ONLY_FIELDS


class VeterinaryLabRequestSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    legacy_input_aliases = {
        **BASE_ALIASES,
        "consulta": "appointment",
        "prontuario": "record",
        "prontuário": "record",
        "solicitada_em": "requested_at",
        "prioridade": "priority",
        "notas_clinicas": "clinical_notes",
        "notas_clínicas": "clinical_notes",
    }
    legacy_output_aliases = legacy_input_aliases

    animal_name = serializers.CharField(source="animal.name", read_only=True)
    owner_name = serializers.CharField(source="animal.owner_name", read_only=True)
    veterinarian_name = serializers.CharField(source="veterinarian.name", read_only=True)
    item_count = serializers.IntegerField(source="items.count", read_only=True)

    class Meta:
        model = VeterinaryLabRequest
        fields = "__all__"
        read_only_fields = (*CORE_READ_ONLY_FIELDS, "animal_name", "owner_name", "veterinarian_name", "item_count")


class VeterinaryLabRequestItemSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    legacy_input_aliases = {
        **BASE_ALIASES,
        "requisicao": "request",
        "requisição": "request",
        "exame": "exam",
        "identificador_amostra": "sample_identifier",
        "colhido_em": "collected_at",
        "resultado_em": "resulted_at",
        "resumo_resultado": "result_summary",
        "valor_resultado": "result_value",
        "referencia": "reference_range",
        "referência": "reference_range",
        "posicao": "position",
        "posição": "position",
    }
    legacy_output_aliases = legacy_input_aliases

    animal_name = serializers.CharField(source="request.animal.name", read_only=True)
    exam_name = serializers.CharField(source="exam.name", read_only=True)
    exam_code = serializers.CharField(source="exam.code", read_only=True)

    class Meta:
        model = VeterinaryLabRequestItem
        fields = "__all__"
        read_only_fields = (*CORE_READ_ONLY_FIELDS, "animal_name", "exam_name", "exam_code")


class VeterinaryAdmissionSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    legacy_input_aliases = {
        **BASE_ALIASES,
        "consulta": "appointment",
        "internado_em": "admitted_at",
        "alta_em": "discharged_at",
        "enfermaria": "ward",
        "box": "cage",
        "gaiola": "cage",
        "motivo": "reason",
        "diagnostico": "diagnosis",
        "diagnóstico": "diagnosis",
        "plano_cuidados": "care_plan",
        "resumo_alta": "discharge_summary",
    }
    legacy_output_aliases = legacy_input_aliases

    animal_name = serializers.CharField(source="animal.name", read_only=True)
    owner_name = serializers.CharField(source="animal.owner_name", read_only=True)
    veterinarian_name = serializers.CharField(source="veterinarian.name", read_only=True)

    class Meta:
        model = VeterinaryAdmission
        fields = "__all__"
        read_only_fields = (*CORE_READ_ONLY_FIELDS, "animal_name", "owner_name", "veterinarian_name")


class VeterinaryPrescriptionSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    legacy_input_aliases = {
        **BASE_ALIASES,
        "prontuario": "record",
        "prontuário": "record",
        "emitida_em": "issued_at",
        "instrucoes": "instructions",
        "instruções": "instructions",
    }
    legacy_output_aliases = legacy_input_aliases

    animal_name = serializers.CharField(source="animal.name", read_only=True)
    owner_name = serializers.CharField(source="animal.owner_name", read_only=True)
    veterinarian_name = serializers.CharField(source="veterinarian.name", read_only=True)
    item_count = serializers.IntegerField(source="items.count", read_only=True)

    class Meta:
        model = VeterinaryPrescription
        fields = "__all__"
        read_only_fields = (*CORE_READ_ONLY_FIELDS, "animal_name", "owner_name", "veterinarian_name", "item_count")


class VeterinaryPrescriptionItemSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    legacy_input_aliases = {
        **BASE_ALIASES,
        "receita": "prescription",
        "medicamento": "medication",
        "nome_medicamento": "medication_name",
        "dosagem": "dosage",
        "via": "route",
        "frequencia": "frequency",
        "frequência": "frequency",
        "duracao_dias": "duration_days",
        "duração_dias": "duration_days",
        "quantidade": "quantity",
        "instrucoes": "instructions",
        "instruções": "instructions",
        "posicao": "position",
        "posição": "position",
    }
    legacy_output_aliases = legacy_input_aliases

    animal_name = serializers.CharField(source="prescription.animal.name", read_only=True)
    medication_display = serializers.SerializerMethodField()

    class Meta:
        model = VeterinaryPrescriptionItem
        fields = "__all__"
        read_only_fields = (*CORE_READ_ONLY_FIELDS, "animal_name", "medication_display")

    def get_medication_display(self, obj: VeterinaryPrescriptionItem) -> str:
        if obj.medication_name:
            return obj.medication_name
        medication = getattr(obj, "medication", None)
        return getattr(medication, "name", "") or ""


SERIALIZER_MAP = {
    "animal": VeterinaryAnimalSerializer,
    "appointment": VeterinaryAppointmentSerializer,
    "record": VeterinaryMedicalRecordSerializer,
    "vaccine": VeterinaryVaccineSerializer,
    "vaccination": VeterinaryVaccinationSerializer,
    "lab_exam": VeterinaryLabExamSerializer,
    "lab_request": VeterinaryLabRequestSerializer,
    "lab_request_item": VeterinaryLabRequestItemSerializer,
    "admission": VeterinaryAdmissionSerializer,
    "prescription": VeterinaryPrescriptionSerializer,
    "prescription_item": VeterinaryPrescriptionItemSerializer,
}
