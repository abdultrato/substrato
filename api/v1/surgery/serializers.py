"""Serializers DRF para cirurgias, bloco operatório e procedimentos cirúrgicos."""

from django.apps import apps
from django.db import transaction
from rest_framework import serializers

from api.v1.compat import LegacyAliasSerializerMixin
from apps.clinical.models.lab_request import LabRequest
from apps.clinical.models.medical_exam import MedicalExam
from apps.clinical_laboratory.models import LabTest
from apps.surgery.models import (
    AnesthesiaRecord,
    LargeSurgery,
    OperatingRoom,
    OperativeReport,
    PreoperativeAssessment,
    RecoveryRecord,
    SmallSurgery,
    Surgery,
    SurgeryProcedureItem,
    SurgicalAuditEvent,
    SurgicalAuthorization,
    SurgicalBillingItem,
    SurgicalConsumption,
    SurgicalDocument,
    SurgicalMaterial,
    SurgicalProcedure,
    SurgicalRequest,
    SurgicalSafetyChecklist,
    SurgicalSchedule,
    SurgicalSpecimen,
    SurgicalTeamMember,
)
from domain.clinical.result_state import ResultState

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
    "codigo": "custom_id",
    "código": "custom_id",
    "nome": "name",
    "descricao": "description",
    "descrição": "description",
    "estado": "status",
    "situacao": "status",
    "situação": "status",
    "ativo": "active",
    "activa": "active",
    "ativa": "active",
    "preco": "base_price",
    "preço": "base_price",
    "preco_base": "base_price",
    "preço_base": "base_price",
    "iva": "vat_percentage",
    "percentagem_iva": "vat_percentage",
    "aplica_iva": "applies_vat_by_default",
    "aplicar_iva": "applies_vat_by_default",
    "aplica_iva_por_padrao": "applies_vat_by_default",
    "aplica_iva_por_padrão": "applies_vat_by_default",
    "observacoes": "notes",
    "observações": "notes",
    "notas": "notes",
}

SURGICAL_PROCEDURE_ALIASES = {
    **BASE_ALIASES,
    "is_surgical": "is_surgical",
    "procedimento_eh_cirurgico": "is_surgical",
    "procedimento_é_cirúrgico": "is_surgical",
    "eh_cirurgico": "is_surgical",
    "é_cirúrgico": "is_surgical",
    "cirurgico": "is_surgical",
    "cirúrgico": "is_surgical",
    "tipo_cirurgia": "surgery_type",
    "porte_cirurgico": "surgery_type",
    "porte_cirúrgico": "surgery_type",
    "procedimento": "name",
    "procedimento_cirurgico": "name",
    "procedimento_cirúrgico": "name",
    "surgical_procedure": "name",
    "procedure": "name",
}

SURGERY_ALIASES = {
    **BASE_ALIASES,
    "paciente": "patient",
    "utente": "patient",
    "doente": "patient",
    "patient": "patient",
    "pedido_cirurgico": "surgical_request",
    "indicacao_cirurgica": "surgical_request",
    "indicação_cirúrgica": "surgical_request",
    "especialidade": "specialty",
    "cirurgiao": "surgeon",
    "cirurgião": "surgeon",
    "medico": "surgeon",
    "médico": "surgeon",
    "doutor": "surgeon",
    "surgeon": "surgeon",
    "procedimento": "procedure",
    "procedimento_livre": "procedure",
    "procedimento_texto": "procedure",
    "procedimento_texto_livre": "procedure",
    "procedures": "procedures",
    "procedimentos": "procedures",
    "procedimentos_cirurgicos": "procedures",
    "procedimentos_cirúrgicos": "procedures",
    "catalogo_procedimentos": "procedures",
    "catálogo_procedimentos": "procedures",
    "preco": "estimated_price",
    "preço": "estimated_price",
    "preco_estimado": "estimated_price",
    "preço_estimado": "estimated_price",
    "valor": "estimated_price",
    "valor_estimado": "estimated_price",
    "custo_estimado": "estimated_price",
    "estimated_price": "estimated_price",
    "data_cirurgia": "scheduled_for",
    "agendada_para": "scheduled_for",
    "marcada_para": "scheduled_for",
    "scheduled_for": "scheduled_for",
    "sala_operatoria": "operating_room",
    "sala_operatória": "operating_room",
    "sala": "operating_room",
    "diagnostico_pre_operatorio": "preoperative_diagnosis",
    "diagnóstico_pré_operatório": "preoperative_diagnosis",
    "diagnostico_pos_operatorio": "postoperative_diagnosis",
    "diagnóstico_pós_operatório": "postoperative_diagnosis",
    "porte": "surgery_size",
    "porte_cirurgia": "surgery_size",
    "tipo_cirurgia": "surgery_size",
    "tamanho": "surgery_size",
    "surgery_size": "surgery_size",
    "prioridade": "priority",
    "classificacao": "classification",
    "classificação": "classification",
    "iniciada_em": "started_at",
    "terminada_em": "ended_at",
    "concluida_em": "completed_at",
    "concluída_em": "completed_at",
    "completed_at": "completed_at",
    "cancelada_em": "canceled_at",
    "cancelado_em": "canceled_at",
    "canceled_at": "canceled_at",
}


class BaseSurgerySerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    legacy_input_aliases = SURGERY_ALIASES
    patient_name = serializers.CharField(source="patient.name", read_only=True)
    surgical_request_code = serializers.CharField(source="surgical_request.custom_id", read_only=True)
    specialty_name = serializers.CharField(source="specialty.name", read_only=True)
    surgeon_name = serializers.SerializerMethodField(method_name="get_surgeon_name")
    surgeon_names = serializers.SerializerMethodField(method_name="get_surgeon_names")
    # M2M — use global queryset so cross-tenant users (HR doctors) are accepted
    surgeons = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=apps.get_model("recursos_humanos", "Employee")._default_manager.all(),
        required=False,
    )
    operating_room_name = serializers.CharField(source="operating_room.name", read_only=True)
    ward_name = serializers.CharField(source="ward.name", read_only=True)
    preoperative_diagnosis = serializers.CharField(allow_blank=True, allow_null=True, required=False, default="")
    postoperative_diagnosis = serializers.CharField(allow_blank=True, allow_null=True, required=False, default="")
    procedure_names = serializers.SerializerMethodField(method_name="get_procedure_names")
    procedure_details = serializers.SerializerMethodField(method_name="get_procedure_details")
    procedures_price_total = serializers.SerializerMethodField(method_name="get_procedures_price_total")
    procedures_vat_percentage = serializers.SerializerMethodField(method_name="get_procedures_vat_percentage")
    invoice_id = serializers.SerializerMethodField(method_name="get_invoice_id")
    invoice_code = serializers.SerializerMethodField(method_name="get_invoice_code")
    invoice_status = serializers.SerializerMethodField(method_name="get_invoice_status")
    legacy_output_aliases = {
        **SURGERY_ALIASES,
        "procedures_nomes": "procedure_names",
    }

    class Meta:
        model = Surgery
        fields = "__all__"
        read_only_fields = (
            *CORE_READ_ONLY_FIELDS,
            "patient_name",
            "surgical_request_code",
            "specialty_name",
            "surgeon_name",
            "surgeon_names",
            "operating_room_name",
            "ward_name",
            "procedure_names",
            "procedure_details",
            "procedures_price_total",
            "procedures_vat_percentage",
            "invoice_id",
            "invoice_code",
            "invoice_status",
        )

    def _effective_surgery_size(self, attrs) -> str:
        if attrs.get("surgery_size"):
            return str(attrs["surgery_size"])
        view = self.context.get("view")
        fixed_surgery_size = getattr(view, "fixed_surgery_size", None)
        if fixed_surgery_size:
            return str(fixed_surgery_size)
        if self.instance and getattr(self.instance, "surgery_size", None):
            return str(self.instance.surgery_size)
        return ""

    def _effective_procedures(self, attrs) -> list[SurgicalProcedure]:
        if "procedures" in attrs:
            return list(attrs.get("procedures") or [])
        if self.instance is not None:
            return list(self.instance.procedures.all())
        return []

    def validate(self, attrs):
        attrs = super().validate(attrs)
        # coerce null diag fields to empty string
        for f in ("preoperative_diagnosis", "postoperative_diagnosis"):
            if attrs.get(f) is None:
                attrs[f] = ""
        procedures = self._effective_procedures(attrs)
        procedure_text = str(attrs.get("procedure") or "").strip()
        surgery_size = self._effective_surgery_size(attrs)

        if procedures and not procedure_text:
            names = [str(getattr(item, "name", "") or item).strip() for item in procedures]
            attrs["procedure"] = ", ".join(name for name in names if name)[:160]

        if procedures and surgery_size in {Surgery.Size.SMALL, Surgery.Size.LARGE}:
            invalid = [
                procedure
                for procedure in procedures
                if getattr(procedure, "surgery_type", "AMBAS") not in {surgery_size, "AMBAS"}
            ]
            if invalid:
                incompatible_names = ", ".join(
                    str(getattr(procedure, "name", procedure)).strip() or f"#{getattr(procedure, 'pk', '?')}"
                    for procedure in invalid
                )
                raise serializers.ValidationError(
                    {
                        "procedures": (
                            f"Os procedimentos selecionados não são compatíveis com "
                            f"{'pequena cirurgia' if surgery_size == Surgery.Size.SMALL else 'grande cirurgia'}: "
                            f"{incompatible_names}."
                        )
                    }
                )

        if self.instance is None and not str(attrs.get("procedure") or "").strip() and not procedures:
            raise serializers.ValidationError(
                {"procedure": "Informe o procedimento em texto livre ou seleccione um procedimento do catálogo."}
            )
        return attrs

    def get_surgeon_name(self, obj: Surgery) -> str:
        u = getattr(obj, "surgeon", None)
        if not u:
            return ""
        try:
            return (u.get_full_name() or "").strip() or u.username
        except Exception:
            return getattr(u, "username", "")

    def get_surgeon_names(self, obj: Surgery) -> list[dict]:
        try:
            return [{"id": e.id, "name": e.name} for e in obj.surgeons.all()]
        except Exception:
            return []

    def get_procedure_names(self, obj: Surgery) -> list[str]:
        try:
            return list(obj.procedures.values_list("name", flat=True))
        except Exception:
            return []

    def get_procedure_details(self, obj: Surgery) -> list[dict]:
        try:
            return [
                {
                    "id": item.id,
                    "name": item.name,
                    "surgery_type": item.surgery_type,
                    "base_price": str(item.base_price or "0.00"),
                    "vat_percentage": str(item.vat_percentage or "0.00"),
                }
                for item in obj.procedures.all()
            ]
        except Exception:
            return []

    def get_procedures_price_total(self, obj: Surgery) -> str:
        try:
            from decimal import Decimal
            total = sum(
                (p.base_price or Decimal("0")) for p in obj.procedures.all()
            )
            return str(total)
        except Exception:
            return "0.00"

    def get_procedures_vat_percentage(self, obj: Surgery) -> str:
        try:
            procs = list(obj.procedures.values_list("vat_percentage", flat=True))
            if procs:
                # Use the most common VAT, falling back to first
                return str(procs[0])
            return "0.00"
        except Exception:
            return "0.00"

    def _get_invoice(self, obj: Surgery):
        try:
            return getattr(obj, "invoice", None)
        except Exception:
            return None

    def get_invoice_id(self, obj: Surgery) -> int | None:
        f = self._get_invoice(obj)
        return getattr(f, "id", None) if f else None

    def get_invoice_code(self, obj: Surgery) -> str:
        f = self._get_invoice(obj)
        return getattr(f, "custom_id", "") if f else ""

    def get_invoice_status(self, obj: Surgery) -> str:
        f = self._get_invoice(obj)
        return getattr(f, "status", "") if f else ""


class SurgicalProcedureSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    legacy_input_aliases = SURGICAL_PROCEDURE_ALIASES
    legacy_output_aliases = SURGICAL_PROCEDURE_ALIASES
    default_materials_detail = serializers.SerializerMethodField()

    class Meta:
        model = SurgicalProcedure
        fields = "__all__"
        read_only_fields = (*CORE_READ_ONLY_FIELDS, "default_materials_detail")

    def validate(self, attrs):
        attrs = super().validate(attrs)
        is_surgical = attrs.get("is_surgical")
        if is_surgical is None and self.instance is not None:
            is_surgical = getattr(self.instance, "is_surgical", True)
        if is_surgical is False:
            attrs["surgery_type"] = "AMBAS"
        return attrs

    def get_default_materials_detail(self, obj):
        try:
            from apps.surgery.models import SurgicalProcedureMaterial
            entries = (
                SurgicalProcedureMaterial.objects
                .filter(procedure=obj, product__deleted=False)
                .select_related("product")
            )
            return [
                {
                    "id": e.product.id,
                    "name": e.product.name,
                    "type": e.product.type,
                    "sale_price": str(e.product.sale_price or "0.00"),
                    "vat_percentage": str(e.product.vat_percentage or "0.00"),
                    "applies_vat_by_default": e.product.applies_vat_by_default,
                    "qty": e.quantity,
                }
                for e in entries
            ]
        except Exception:
            return []

    def _get_materials_input(self):
        request = self.context.get("request")
        if request and request.data:
            return request.data.get("default_materials_detail")
        return None

    def create(self, validated_data):
        materials_input = self._get_materials_input()
        instance = super().create(validated_data)
        if materials_input is not None:
            self._sync_materials(instance, materials_input)
        return instance

    def update(self, instance, validated_data):
        materials_input = self._get_materials_input()
        instance = super().update(instance, validated_data)
        if materials_input is not None:
            self._sync_materials(instance, materials_input)
        return instance

    def _sync_materials(self, instance, materials_input):
        from apps.surgery.models import SurgicalProcedureMaterial
        desired = {}
        for entry in materials_input:
            try:
                pid = int(entry.get("id") or entry.get("product_id"))
                qty = max(1, int(entry.get("qty") or entry.get("quantity") or 1))
                desired[pid] = qty
            except (TypeError, ValueError):
                continue

        existing = {e.product_id: e for e in SurgicalProcedureMaterial.objects.filter(procedure=instance)}

        for pid in list(existing):
            if pid not in desired:
                existing[pid].delete()

        for pid, qty in desired.items():
            if pid in existing:
                if existing[pid].quantity != qty:
                    existing[pid].quantity = qty
                    existing[pid].save(update_fields=["quantity"])
            else:
                SurgicalProcedureMaterial.objects.create(procedure=instance, product_id=pid, quantity=qty)


class SurgerySerializer(BaseSurgerySerializer):
    class Meta(BaseSurgerySerializer.Meta):
        model = Surgery


def _sync_procedure_consumptions(surgery_instance) -> None:
    """Add default_materials from all procedures as SurgicalConsumption rows.

    Only adds missing items — never removes manually added consumptions.
    """
    from apps.surgery.models import SurgicalProcedureMaterial

    existing_product_ids = set(
        SurgicalConsumption.objects.filter(surgery=surgery_instance).values_list("product_id", flat=True)
    )

    seen: set[int] = set()
    for proc in surgery_instance.procedures.prefetch_related("material_entries__product").all():
        for entry in proc.material_entries.select_related("product").all():
            pid = entry.product_id
            if pid in existing_product_ids or pid in seen:
                continue
            seen.add(pid)
            SurgicalConsumption.objects.get_or_create(
                surgery=surgery_instance,
                product_id=pid,
                defaults={
                    "quantity": entry.quantity,
                    "unit_cost": entry.product.sale_price or 0,
                    "charged_price": entry.product.sale_price or 0,
                },
            )


class SmallSurgerySerializer(BaseSurgerySerializer):
    class Meta(BaseSurgerySerializer.Meta):
        model = SmallSurgery

    def update(self, instance, validated_data):
        had_procedures = set(instance.procedures.values_list("id", flat=True))
        instance = super().update(instance, validated_data)
        new_procedures = set(instance.procedures.values_list("id", flat=True))
        if new_procedures != had_procedures:
            _sync_procedure_consumptions(instance)
        return instance

    def create(self, validated_data):
        instance = super().create(validated_data)
        _sync_procedure_consumptions(instance)
        return instance


class LargeSurgerySerializer(BaseSurgerySerializer):
    class Meta(BaseSurgerySerializer.Meta):
        model = LargeSurgery

    def update(self, instance, validated_data):
        had_procedures = set(instance.procedures.values_list("id", flat=True))
        instance = super().update(instance, validated_data)
        new_procedures = set(instance.procedures.values_list("id", flat=True))
        if new_procedures != had_procedures:
            _sync_procedure_consumptions(instance)
        return instance

    def create(self, validated_data):
        instance = super().create(validated_data)
        _sync_procedure_consumptions(instance)
        return instance


class SurgicalRequestSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    patient_name = serializers.CharField(source="patient.name", read_only=True)
    requesting_doctor_name = serializers.CharField(source="requesting_doctor.name", read_only=True)
    specialty_name = serializers.CharField(source="specialty.name", read_only=True)
    legacy_input_aliases = {
        **BASE_ALIASES,
        "paciente": "patient",
        "medico_solicitante": "requesting_doctor",
        "médico_solicitante": "requesting_doctor",
        "especialidade": "specialty",
        "diagnostico_clinico": "clinical_diagnosis",
        "diagnóstico_clínico": "clinical_diagnosis",
        "cid": "icd_code",
        "icd": "icd_code",
        "tipo_cirurgia_solicitada": "requested_surgery_type",
        "procedimento_solicitado": "requested_procedure",
        "prioridade": "priority",
        "justificacao": "justification",
        "justificação": "justification",
        "revisto_em": "reviewed_at",
        "convertido_em": "converted_at",
    }
    legacy_output_aliases = legacy_input_aliases

    class Meta:
        model = SurgicalRequest
        fields = "__all__"
        read_only_fields = (*CORE_READ_ONLY_FIELDS, "patient_name", "requesting_doctor_name", "specialty_name")


class PreoperativeAssessmentSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    patient_name = serializers.CharField(source="patient.name", read_only=True)
    surgical_request_code = serializers.CharField(source="surgical_request.custom_id", read_only=True)
    proposed_surgery_code = serializers.CharField(source="proposed_surgery.custom_id", read_only=True)
    evaluator_name = serializers.CharField(source="evaluator.name", read_only=True)
    laboratory_exams = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=LabTest.objects.all(),
        required=False,
        write_only=True,
    )
    medical_exams = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=MedicalExam.objects.all(),
        required=False,
        write_only=True,
    )
    laboratory_exams_details = serializers.SerializerMethodField()
    medical_exams_details = serializers.SerializerMethodField()
    laboratory_request_id = serializers.SerializerMethodField()
    laboratory_request_code = serializers.SerializerMethodField()
    medical_request_id = serializers.SerializerMethodField()
    medical_request_code = serializers.SerializerMethodField()
    legacy_input_aliases = {
        **BASE_ALIASES,
        "paciente": "patient",
        "pedido_cirurgico": "surgical_request",
        "pedido_cirúrgico": "surgical_request",
        "cirurgia_proposta": "proposed_surgery",
        "avaliador": "evaluator",
        "avaliacao_medica": "medical_evaluation",
        "avaliação_médica": "medical_evaluation",
        "avaliacao_anestesica": "anesthetic_evaluation",
        "avaliação_anestésica": "anesthetic_evaluation",
        "classe_asa": "asa_class",
        "risco_cirurgico": "surgical_risk",
        "risco_cirúrgico": "surgical_risk",
        "exames_necessarios": "required_exams",
        "exames_necessários": "required_exams",
        "exames_laboratoriais": "laboratory_exams",
        "exame_laboratorial": "laboratory_exams",
        "exames_medicos": "medical_exams",
        "exames_médicos": "medical_exams",
        "exames_revistos": "exam_results_reviewed",
        "apto_para_cirurgia": "fit_for_surgery",
        "consentimento_assinado": "consent_signed",
        "avaliado_em": "assessed_at",
        "observacoes": "observations",
        "observações": "observations",
    }
    legacy_output_aliases = legacy_input_aliases

    class Meta:
        model = PreoperativeAssessment
        fields = "__all__"
        read_only_fields = (
            *CORE_READ_ONLY_FIELDS,
            "patient_name",
            "surgical_request_code",
            "proposed_surgery_code",
            "evaluator_name",
            "laboratory_exams_details",
            "medical_exams_details",
            "laboratory_request_id",
            "laboratory_request_code",
            "medical_request_id",
            "medical_request_code",
        )

    @staticmethod
    def _normalize_required_exams_payload(value):
        payload = {
            "laboratory_exams": [],
            "medical_exams": [],
            "laboratory_request": None,
            "medical_request": None,
        }
        if isinstance(value, dict):
            payload["laboratory_exams"] = list(value.get("laboratory_exams") or [])
            payload["medical_exams"] = list(value.get("medical_exams") or [])
            payload["laboratory_request"] = value.get("laboratory_request")
            payload["medical_request"] = value.get("medical_request")
            legacy_value = value.get("legacy_required_exams")
            if legacy_value not in (None, "", [], {}):
                payload["legacy_required_exams"] = legacy_value
            return payload
        if value not in (None, "", [], {}):
            payload["legacy_required_exams"] = value
        return payload

    @staticmethod
    def _lab_test_summary(test):
        return {
            "id": test.id,
            "custom_id": test.custom_id,
            "code": getattr(test, "code", ""),
            "name": test.name,
            "sector_name": getattr(getattr(test, "sector", None), "name", None),
            "sample_type": getattr(test, "sample_type", "") or "",
        }

    @staticmethod
    def _medical_exam_summary(exam):
        return {
            "id": exam.id,
            "custom_id": exam.custom_id,
            "name": exam.name,
            "method": getattr(exam, "method", None),
            "sector": getattr(exam, "sector", None),
        }

    @staticmethod
    def _request_summary(request):
        if request is None:
            return None
        return {
            "id": request.id,
            "custom_id": request.custom_id,
            "type": request.type,
            "status": request.status,
            "validated_at": request.validated_at,
            "collected_at": request.collected_at,
        }

    def _required_exams_payload(self, obj):
        return self._normalize_required_exams_payload(getattr(obj, "required_exams", None))

    def _linked_request(self, obj, field_name, expected_type):
        request_payload = self._required_exams_payload(obj).get(field_name)
        request_id = request_payload.get("id") if isinstance(request_payload, dict) else None
        if not request_id:
            return None
        return LabRequest.objects.filter(
            pk=request_id,
            patient_id=obj.patient_id,
            type=expected_type,
        ).first()

    def _request_item_queryset(self, request, *, medical=False):
        if request is None:
            return request
        if medical:
            return request.items.filter(deleted=False, medical_exam__isnull=False).select_related("medical_exam")
        return request.items.filter(deleted=False, exam__isnull=False).select_related("exam")

    def _current_laboratory_exams(self, obj):
        request = self._linked_request(obj, "laboratory_request", LabRequest.Type.LABORATORY)
        if request is not None:
            return [item.exam for item in self._request_item_queryset(request, medical=False) if item.exam is not None]
        exam_ids = [
            item.get("id")
            for item in self._required_exams_payload(obj).get("laboratory_exams") or []
            if isinstance(item, dict) and item.get("id")
        ]
        if not exam_ids:
            return []
        mapped = {exam.id: exam for exam in LabTest.objects.filter(id__in=exam_ids)}
        return [mapped[exam_id] for exam_id in exam_ids if exam_id in mapped]

    def _current_medical_exams(self, obj):
        request = self._linked_request(obj, "medical_request", LabRequest.Type.MEDICAL_EXAM)
        if request is not None:
            return [item.medical_exam for item in self._request_item_queryset(request, medical=True) if item.medical_exam is not None]
        exam_ids = [
            item.get("id")
            for item in self._required_exams_payload(obj).get("medical_exams") or []
            if isinstance(item, dict) and item.get("id")
        ]
        if not exam_ids:
            return []
        mapped = {exam.id: exam for exam in MedicalExam.objects.filter(id__in=exam_ids)}
        return [mapped[exam_id] for exam_id in exam_ids if exam_id in mapped]

    def get_laboratory_exams_details(self, obj):
        return [self._lab_test_summary(test) for test in self._current_laboratory_exams(obj)]

    def get_medical_exams_details(self, obj):
        return [self._medical_exam_summary(exam) for exam in self._current_medical_exams(obj)]

    def get_laboratory_request_id(self, obj):
        request = self._linked_request(obj, "laboratory_request", LabRequest.Type.LABORATORY)
        return request.id if request is not None else None

    def get_laboratory_request_code(self, obj):
        request = self._linked_request(obj, "laboratory_request", LabRequest.Type.LABORATORY)
        return request.custom_id if request is not None else None

    def get_medical_request_id(self, obj):
        request = self._linked_request(obj, "medical_request", LabRequest.Type.MEDICAL_EXAM)
        return request.id if request is not None else None

    def get_medical_request_code(self, obj):
        request = self._linked_request(obj, "medical_request", LabRequest.Type.MEDICAL_EXAM)
        return request.custom_id if request is not None else None

    def _resolve_requesting_physician(self, validated_data, instance=None):
        if "evaluator" in validated_data:
            return validated_data.get("evaluator")
        if instance is not None and instance.evaluator_id:
            return instance.evaluator

        if "surgical_request" in validated_data:
            surgical_request = validated_data.get("surgical_request")
            if surgical_request is not None:
                return getattr(surgical_request, "requesting_doctor", None)

        if instance is not None and instance.surgical_request_id:
            return getattr(instance.surgical_request, "requesting_doctor", None)

        return None

    @staticmethod
    def _can_rewrite_request(request):
        return (
            request is not None
            and request.status == ResultState.PENDING
            and not request.validated_at
            and not request.collected_at
        )

    def _sync_request_items(self, request, desired_exams, *, medical=False):
        desired_ids = {exam.id for exam in desired_exams}
        current_items = list(self._request_item_queryset(request, medical=medical))
        current_ids = {
            (item.medical_exam_id if medical else item.exam_id)
            for item in current_items
            if (item.medical_exam_id if medical else item.exam_id) is not None
        }

        for item in current_items:
            item_exam_id = item.medical_exam_id if medical else item.exam_id
            if item_exam_id not in desired_ids:
                item.delete()

        for exam in desired_exams:
            if exam.id in current_ids:
                continue
            if medical:
                request.add_medical_exam(exam)
            else:
                request.add_exam(exam)

    def _sync_clinical_request(self, *, obj, exams, request_field, request_type, requesting_physician, medical=False):
        request = self._linked_request(obj, request_field, request_type)

        if request is not None and request.status == ResultState.CANCELED:
            request = None

        if not exams:
            if request is None:
                return None
            if not self._can_rewrite_request(request):
                raise serializers.ValidationError(
                    {request_field: "Não é possível remover exames já encaminhados para o fluxo clínico."}
                )
            request.cancelar()
            return None

        if request is None:
            request = LabRequest.objects.create(
                patient=obj.patient,
                type=request_type,
                requesting_physician=requesting_physician,
            )
        elif not self._can_rewrite_request(request):
            current_ids = {
                (item.medical_exam_id if medical else item.exam_id)
                for item in self._request_item_queryset(request, medical=medical)
                if (item.medical_exam_id if medical else item.exam_id) is not None
            }
            desired_ids = {exam.id for exam in exams}
            physician_id = getattr(requesting_physician, "id", None)
            if current_ids != desired_ids or request.requesting_physician_id != physician_id:
                raise serializers.ValidationError(
                    {request_field: "Não é possível alterar exames já encaminhados para receção/enfermagem/laboratório."}
                )
            return request

        if request.requesting_physician_id != getattr(requesting_physician, "id", None):
            request.requesting_physician = requesting_physician
            request.save(update_fields=["requesting_physician", "updated_at"])

        self._sync_request_items(request, exams, medical=medical)
        return request

    def _sync_required_exam_requests(self, obj, *, laboratory_exams, medical_exams, requesting_physician):
        laboratory_request = self._sync_clinical_request(
            obj=obj,
            exams=list(laboratory_exams),
            request_field="laboratory_request",
            request_type=LabRequest.Type.LABORATORY,
            requesting_physician=requesting_physician,
            medical=False,
        )
        medical_request = self._sync_clinical_request(
            obj=obj,
            exams=list(medical_exams),
            request_field="medical_request",
            request_type=LabRequest.Type.MEDICAL_EXAM,
            requesting_physician=requesting_physician,
            medical=True,
        )

        obj.required_exams = {
            "laboratory_exams": [self._lab_test_summary(test) for test in laboratory_exams],
            "medical_exams": [self._medical_exam_summary(exam) for exam in medical_exams],
            "laboratory_request": self._request_summary(laboratory_request),
            "medical_request": self._request_summary(medical_request),
        }
        obj.save(update_fields=["required_exams", "updated_at"])
        return obj

    @transaction.atomic
    def create(self, validated_data):
        laboratory_exams = validated_data.pop("laboratory_exams", None)
        medical_exams = validated_data.pop("medical_exams", None)
        instance = super().create(validated_data)

        if laboratory_exams is None and medical_exams is None:
            return instance

        return self._sync_required_exam_requests(
            instance,
            laboratory_exams=list(laboratory_exams or []),
            medical_exams=list(medical_exams or []),
            requesting_physician=self._resolve_requesting_physician(validated_data, instance=instance),
        )

    @transaction.atomic
    def update(self, instance, validated_data):
        laboratory_exams = validated_data.pop("laboratory_exams", serializers.empty)
        medical_exams = validated_data.pop("medical_exams", serializers.empty)
        instance = super().update(instance, validated_data)

        if laboratory_exams is serializers.empty and medical_exams is serializers.empty:
            return instance

        current_laboratory_exams = self._current_laboratory_exams(instance)
        current_medical_exams = self._current_medical_exams(instance)

        return self._sync_required_exam_requests(
            instance,
            laboratory_exams=list(current_laboratory_exams if laboratory_exams is serializers.empty else laboratory_exams),
            medical_exams=list(current_medical_exams if medical_exams is serializers.empty else medical_exams),
            requesting_physician=self._resolve_requesting_physician(validated_data, instance=instance),
        )


class OperatingRoomSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    legacy_input_aliases = {
        **BASE_ALIASES,
        "tipo_sala": "room_type",
        "localizacao": "location",
        "localização": "location",
        "capacidade": "capacity",
        "esterilizada": "sterile",
        "equipamentos": "equipment",
        "equipment_notes": "equipment",
        "horario_funcionamento": "working_hours",
        "horário_funcionamento": "working_hours",
        "classe_limpeza": "cleaning_class",
        "motivo_bloqueio": "blocked_reason",
    }
    legacy_output_aliases = legacy_input_aliases

    equipment_names = serializers.SerializerMethodField(method_name="get_equipment_names")
    equipment = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=apps.get_model("equipamentos", "Equipment")._default_manager.all(),
        required=False,
    )

    class Meta:
        model = OperatingRoom
        fields = "__all__"
        read_only_fields = (*CORE_READ_ONLY_FIELDS, "code", "equipment_names")

    def get_equipment_names(self, obj: OperatingRoom) -> list[dict]:
        return [{"id": equipment.id, "name": equipment.name} for equipment in obj.equipment.all()]

    def validate_equipment(self, equipment):
        request = self.context.get("request")
        tenant = getattr(request, "tenant", None) or getattr(self.instance, "tenant", None)
        if tenant is not None and any(item.tenant_id != tenant.id for item in equipment):
            raise serializers.ValidationError("Selecione apenas equipamentos deste tenant.")
        return equipment


class SurgicalScheduleSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    surgery_code = serializers.CharField(source="surgery.custom_id", read_only=True)
    patient_name = serializers.CharField(source="surgery.patient.name", read_only=True)
    operating_room_name = serializers.CharField(source="operating_room.name", read_only=True)
    primary_surgeon_name = serializers.CharField(source="primary_surgeon.name", read_only=True)
    anesthetist_name = serializers.CharField(source="anesthetist.name", read_only=True)
    legacy_input_aliases = {
        **BASE_ALIASES,
        "cirurgia": "surgery",
        "centro_cirurgico": "operating_room",
        "centro_cirúrgico": "operating_room",
        "sala": "operating_room",
        "cirurgiao_principal": "primary_surgeon",
        "cirurgião_principal": "primary_surgeon",
        "anestesista": "anesthetist",
        "inicio_previsto": "scheduled_start",
        "início_previsto": "scheduled_start",
        "fim_previsto": "scheduled_end",
        "prioridade": "priority",
        "autorizacao_verificada": "authorization_verified",
        "autorização_verificada": "authorization_verified",
        "checkin_paciente_em": "patient_checked_in_at",
        "motivo_cancelamento": "cancellation_reason",
    }
    legacy_output_aliases = legacy_input_aliases

    class Meta:
        model = SurgicalSchedule
        fields = "__all__"
        read_only_fields = (
            *CORE_READ_ONLY_FIELDS,
            "surgery_code",
            "patient_name",
            "operating_room_name",
            "primary_surgeon_name",
            "anesthetist_name",
        )


class SurgicalTeamMemberSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    surgery_code = serializers.CharField(source="surgery.custom_id", read_only=True)
    employee_name = serializers.CharField(source="employee.name", read_only=True)
    legacy_input_aliases = {
        **BASE_ALIASES,
        "cirurgia": "surgery",
        "funcionario": "employee",
        "funcionário": "employee",
        "profissional": "employee",
        "funcao": "role",
        "função": "role",
        "principal": "lead",
        "presente": "present",
        "entrada_em": "entry_at",
        "saida_em": "exit_at",
        "saída_em": "exit_at",
        "responsabilidade": "responsibility",
        "assinado_em": "signed_at",
        "referencia_assinatura": "signature_reference",
        "referência_assinatura": "signature_reference",
    }
    legacy_output_aliases = legacy_input_aliases

    class Meta:
        model = SurgicalTeamMember
        fields = "__all__"
        read_only_fields = (*CORE_READ_ONLY_FIELDS, "surgery_code", "employee_name")


class AnesthesiaRecordSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    surgery_code = serializers.CharField(source="surgery.custom_id", read_only=True)
    anesthetist_name = serializers.CharField(source="anesthetist.name", read_only=True)
    legacy_input_aliases = {
        **BASE_ALIASES,
        "cirurgia": "surgery",
        "anestesista": "anesthetist",
        "tipo_anestesia": "anesthesia_type",
        "classe_asa": "asa_class",
        "inducao_em": "induction_at",
        "indução_em": "induction_at",
        "iniciada_em": "started_at",
        "terminada_em": "ended_at",
        "via_aerea": "airway_management",
        "via_aérea": "airway_management",
        "farmacos": "medications",
        "fármacos": "medications",
        "fluidos": "fluids",
        "sinais_vitais": "vital_signs",
        "eventos_adversos": "adverse_events",
        "passagem_recuperacao": "recovery_handoff",
        "passagem_recuperação": "recovery_handoff",
        "complicacoes": "complications",
        "complicações": "complications",
    }
    legacy_output_aliases = legacy_input_aliases

    class Meta:
        model = AnesthesiaRecord
        fields = "__all__"
        read_only_fields = (*CORE_READ_ONLY_FIELDS, "surgery_code", "anesthetist_name")


class SurgicalSafetyChecklistSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    surgery_code = serializers.CharField(source="surgery.custom_id", read_only=True)
    patient_name = serializers.CharField(source="surgery.patient.name", read_only=True)
    completed_by_name = serializers.CharField(source="completed_by.name", read_only=True)
    is_complete = serializers.BooleanField(read_only=True)
    legacy_input_aliases = {
        **BASE_ALIASES,
        "cirurgia": "surgery",
        "preenchido_por": "completed_by",
        "fase": "phase",
        "estado": "status",
        "identidade_confirmada": "patient_identity_confirmed",
        "procedimento_confirmado": "procedure_confirmed",
        "local_marcado": "site_marked",
        "consentimento_confirmado": "consent_confirmed",
        "seguranca_anestesica": "anesthesia_safety_checked",
        "segurança_anestésica": "anesthesia_safety_checked",
        "profilaxia_antibiotica": "antibiotic_prophylaxis",
        "contagem_instrumentos": "instrument_count_confirmed",
        "amostras_identificadas": "specimens_labeled",
        "concluido_em": "completed_at",
        "concluído_em": "completed_at",
        "motivo_sobrescrita": "override_reason",
    }
    legacy_output_aliases = legacy_input_aliases

    class Meta:
        model = SurgicalSafetyChecklist
        fields = "__all__"
        read_only_fields = (*CORE_READ_ONLY_FIELDS, "surgery_code", "patient_name", "completed_by_name", "is_complete")


class SurgicalMaterialSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)
    legacy_input_aliases = {
        **BASE_ALIASES,
        "produto": "product",
        "tipo_material": "material_type",
        "unidade": "unit",
        "codigo_interno": "internal_code",
        "código_interno": "internal_code",
        "preco_custo": "cost_price",
        "preço_custo": "cost_price",
        "preco_venda": "sale_price",
        "preço_venda": "sale_price",
        "lote": "batch_number",
        "validade": "expiry_date",
        "implantavel": "implantable",
        "implantável": "implantable",
        "esterilizavel": "sterilizable",
        "esterilizável": "sterilizable",
        "controla_lote": "tracks_lot",
        "controla_validade": "tracks_expiry",
        "reutilizavel": "reusable",
        "reutilizável": "reusable",
        "esteril": "sterile",
        "estéril": "sterile",
    }
    legacy_output_aliases = legacy_input_aliases

    class Meta:
        model = SurgicalMaterial
        fields = "__all__"
        read_only_fields = (*CORE_READ_ONLY_FIELDS, "product_name")


class SurgicalConsumptionSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    surgery_code = serializers.CharField(source="surgery.custom_id", read_only=True)
    material_name = serializers.CharField(source="material.name", read_only=True)
    product_name = serializers.CharField(source="product.name", read_only=True)
    consumed_by_name = serializers.CharField(source="consumed_by.name", read_only=True)
    total_cost = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)
    line_total = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)
    legacy_input_aliases = {
        **BASE_ALIASES,
        "cirurgia": "surgery",
        "material": "material",
        "produto": "product",
        "consumido_por": "consumed_by",
        "quantidade": "quantity",
        "custo_unitario": "unit_cost",
        "custo_unitário": "unit_cost",
        "preco_cobrado": "charged_price",
        "preço_cobrado": "charged_price",
        "consumido_em": "consumed_at",
        "lote": "batch_number",
        "validade": "expiry_date",
        "estado_material": "material_status",
        "estado_faturacao": "billing_status",
        "estado_faturação": "billing_status",
        "stock_baixado": "inventory_deducted",
        "quantidade_devolvida": "returned_quantity",
    }
    legacy_output_aliases = legacy_input_aliases

    class Meta:
        model = SurgicalConsumption
        fields = "__all__"
        read_only_fields = (
            *CORE_READ_ONLY_FIELDS,
            "surgery_code",
            "material_name",
            "product_name",
            "consumed_by_name",
            "total_cost",
            "line_total",
        )


class RecoveryRecordSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    surgery_code = serializers.CharField(source="surgery.custom_id", read_only=True)
    patient_name = serializers.CharField(source="surgery.patient.name", read_only=True)
    nurse_name = serializers.CharField(source="nurse.name", read_only=True)
    legacy_input_aliases = {
        **BASE_ALIASES,
        "cirurgia": "surgery",
        "enfermeiro": "nurse",
        "admitido_em": "admitted_at",
        "alta_em": "discharged_at",
        "nivel_consciencia": "consciousness_level",
        "nível_consciência": "consciousness_level",
        "dor": "pain_score",
        "aldrete": "aldrete_score",
        "sinais_vitais": "vital_signs",
        "nauseas_vomitos": "nausea_vomiting",
        "náuseas_vómitos": "nausea_vomiting",
        "sangramento": "bleeding",
        "complicacoes": "complications",
        "complicações": "complications",
        "destino": "destination",
    }
    legacy_output_aliases = legacy_input_aliases

    class Meta:
        model = RecoveryRecord
        fields = "__all__"
        read_only_fields = (*CORE_READ_ONLY_FIELDS, "surgery_code", "patient_name", "nurse_name")


class OperativeReportSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    surgery_code = serializers.CharField(source="surgery.custom_id", read_only=True)
    patient_name = serializers.CharField(source="surgery.patient.name", read_only=True)
    primary_surgeon_name = serializers.CharField(source="primary_surgeon.name", read_only=True)
    legacy_input_aliases = {
        **BASE_ALIASES,
        "cirurgia": "surgery",
        "cirurgiao_principal": "primary_surgeon",
        "cirurgião_principal": "primary_surgeon",
        "diagnostico_pre_operatorio": "preoperative_diagnosis",
        "diagnóstico_pré_operatório": "preoperative_diagnosis",
        "diagnostico_pos_operatorio": "postoperative_diagnosis",
        "diagnóstico_pós_operatório": "postoperative_diagnosis",
        "procedimento_realizado": "procedure_performed",
        "achados": "findings",
        "tecnica": "technique",
        "técnica": "technique",
        "complicacoes": "complications",
        "complicações": "complications",
        "perda_sanguinea_ml": "estimated_blood_loss_ml",
        "amostras": "specimens",
        "drenos": "drains",
        "implantes": "implants",
        "condicao_final_paciente": "final_patient_condition",
        "condição_final_paciente": "final_patient_condition",
        "plano_pos_operatorio": "postoperative_plan",
        "plano_pós_operatório": "postoperative_plan",
        "amostra_patologia": "specimen_sent_to_pathology",
        "numero_patologia": "pathology_accession_number",
        "iniciada_em": "started_at",
        "terminada_em": "ended_at",
        "assinado_em": "signed_at",
        "assinado_digitalmente": "digitally_signed",
        "referencia_assinatura_digital": "digital_signature_reference",
        "referência_assinatura_digital": "digital_signature_reference",
    }
    legacy_output_aliases = legacy_input_aliases

    class Meta:
        model = OperativeReport
        fields = "__all__"
        read_only_fields = (*CORE_READ_ONLY_FIELDS, "surgery_code", "patient_name", "primary_surgeon_name")


class SurgeryProcedureItemSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    surgery_code = serializers.CharField(source="surgery.custom_id", read_only=True)
    patient_name = serializers.CharField(source="surgery.patient.name", read_only=True)
    procedure_name = serializers.CharField(source="procedure.name", read_only=True)
    responsible_surgeon_name = serializers.CharField(source="responsible_surgeon.name", read_only=True)
    line_total = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)
    total_with_vat = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)
    legacy_input_aliases = {
        **BASE_ALIASES,
        "cirurgia": "surgery",
        "procedimento": "procedure",
        "regiao_anatomica": "anatomical_region",
        "região_anatómica": "anatomical_region",
        "lateralidade": "laterality",
        "ordem": "sequence",
        "cirurgiao_responsavel": "responsible_surgeon",
        "cirurgião_responsável": "responsible_surgeon",
        "quantidade": "quantity",
        "preco_unitario": "unit_price",
        "preço_unitário": "unit_price",
        "iva": "vat_percentage",
        "aplica_iva": "applies_vat",
        "iniciado_em": "started_at",
        "concluido_em": "ended_at",
        "concluído_em": "ended_at",
    }
    legacy_output_aliases = legacy_input_aliases

    class Meta:
        model = SurgeryProcedureItem
        fields = "__all__"
        read_only_fields = (
            *CORE_READ_ONLY_FIELDS,
            "surgery_code",
            "patient_name",
            "procedure_name",
            "responsible_surgeon_name",
            "line_total",
            "total_with_vat",
        )


class SurgicalAuthorizationSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    patient_name = serializers.CharField(source="patient.name", read_only=True)
    surgery_code = serializers.CharField(source="surgery.custom_id", read_only=True)
    surgical_request_code = serializers.CharField(source="surgical_request.custom_id", read_only=True)
    preoperative_assessment_code = serializers.CharField(source="preoperative_assessment.custom_id", read_only=True)
    legacy_input_aliases = {
        **BASE_ALIASES,
        "paciente": "patient",
        "cirurgia": "surgery",
        "pedido_cirurgico": "surgical_request",
        "pedido_cirúrgico": "surgical_request",
        "avaliacao_pre_operatoria": "preoperative_assessment",
        "avaliação_pré_operatória": "preoperative_assessment",
        "valor_orcamentado": "quotation_amount",
        "valor_orçamentado": "quotation_amount",
        "valor_aprovado": "approved_amount",
        "pagamento_inicial": "initial_payment_amount",
        "orcamento_aprovado": "budget_approved",
        "orçamento_aprovado": "budget_approved",
        "pagamento_inicial_recebido": "initial_payment_received",
        "seguro_autorizou": "insurance_authorized",
        "materiais_especiais_aprovados": "special_materials_approved",
        "sala_disponivel": "room_available",
        "sala_disponível": "room_available",
        "equipa_disponivel": "team_available",
        "equipa_disponível": "team_available",
        "avaliacao_pre_operatoria_concluida": "preoperative_assessment_completed",
        "avaliação_pré_operatória_concluída": "preoperative_assessment_completed",
        "consentimento_assinado": "consent_signed",
        "valida_ate": "valid_until",
        "válida_até": "valid_until",
        "aprovada_em": "approved_at",
        "motivo_rejeicao": "rejected_reason",
        "motivo_rejeição": "rejected_reason",
    }
    legacy_output_aliases = legacy_input_aliases

    class Meta:
        model = SurgicalAuthorization
        fields = "__all__"
        read_only_fields = (
            *CORE_READ_ONLY_FIELDS,
            "patient_name",
            "surgery_code",
            "surgical_request_code",
            "preoperative_assessment_code",
        )


class SurgicalBillingItemSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    surgery_code = serializers.CharField(source="surgery.custom_id", read_only=True)
    patient_name = serializers.CharField(source="surgery.patient.name", read_only=True)
    authorization_code = serializers.CharField(source="authorization.custom_id", read_only=True)
    procedure_item_code = serializers.CharField(source="procedure_item.custom_id", read_only=True)
    consumption_code = serializers.CharField(source="consumption.custom_id", read_only=True)
    invoice_code = serializers.CharField(source="invoice.custom_id", read_only=True)
    line_total = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)
    total_with_vat = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)
    legacy_input_aliases = {
        **BASE_ALIASES,
        "cirurgia": "surgery",
        "autorizacao": "authorization",
        "autorização": "authorization",
        "procedimento_realizado": "procedure_item",
        "consumo": "consumption",
        "fatura": "invoice",
        "evento_faturavel": "event_type",
        "evento_faturável": "event_type",
        "modo_cobranca": "billing_mode",
        "modo_cobrança": "billing_mode",
        "quantidade": "quantity",
        "preco_unitario": "unit_price",
        "preço_unitário": "unit_price",
        "iva": "vat_percentage",
        "aplica_iva": "applies_vat",
        "faturavel": "billable",
        "faturável": "billable",
        "faturado_em": "billed_at",
    }
    legacy_output_aliases = legacy_input_aliases

    class Meta:
        model = SurgicalBillingItem
        fields = "__all__"
        read_only_fields = (
            *CORE_READ_ONLY_FIELDS,
            "surgery_code",
            "patient_name",
            "authorization_code",
            "procedure_item_code",
            "consumption_code",
            "invoice_code",
            "line_total",
            "total_with_vat",
        )


class SurgicalDocumentSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    surgery_code = serializers.CharField(source="surgery.custom_id", read_only=True)
    surgical_request_code = serializers.CharField(source="surgical_request.custom_id", read_only=True)
    preoperative_assessment_code = serializers.CharField(source="preoperative_assessment.custom_id", read_only=True)
    authorization_code = serializers.CharField(source="authorization.custom_id", read_only=True)
    uploaded_by_name = serializers.CharField(source="uploaded_by.name", read_only=True)
    legacy_input_aliases = {
        **BASE_ALIASES,
        "cirurgia": "surgery",
        "pedido_cirurgico": "surgical_request",
        "pedido_cirúrgico": "surgical_request",
        "avaliacao_pre_operatoria": "preoperative_assessment",
        "avaliação_pré_operatória": "preoperative_assessment",
        "autorizacao": "authorization",
        "autorização": "authorization",
        "carregado_por": "uploaded_by",
        "titulo": "title",
        "título": "title",
        "tipo_documento": "document_type",
        "ficheiro": "file",
        "arquivo": "file",
        "referencia_externa": "external_reference",
        "referência_externa": "external_reference",
        "assinado_em": "signed_at",
        "expira_em": "expires_at",
    }
    legacy_output_aliases = legacy_input_aliases

    class Meta:
        model = SurgicalDocument
        fields = "__all__"
        read_only_fields = (
            *CORE_READ_ONLY_FIELDS,
            "surgery_code",
            "surgical_request_code",
            "preoperative_assessment_code",
            "authorization_code",
            "uploaded_by_name",
        )


class SurgicalAuditEventSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    surgery_code = serializers.CharField(source="surgery.custom_id", read_only=True)
    surgical_request_code = serializers.CharField(source="surgical_request.custom_id", read_only=True)
    actor_name = serializers.CharField(source="actor.name", read_only=True)
    legacy_input_aliases = {
        **BASE_ALIASES,
        "cirurgia": "surgery",
        "pedido_cirurgico": "surgical_request",
        "pedido_cirúrgico": "surgical_request",
        "responsavel": "actor",
        "responsável": "actor",
        "tipo_evento": "event_type",
        "acao": "action",
        "ação": "action",
        "estado_anterior": "previous_state",
        "novo_estado": "new_state",
        "metadados": "metadata",
        "ocorrido_em": "occurred_at",
    }
    legacy_output_aliases = legacy_input_aliases

    class Meta:
        model = SurgicalAuditEvent
        fields = "__all__"
        read_only_fields = (*CORE_READ_ONLY_FIELDS, "surgery_code", "surgical_request_code", "actor_name")


class SurgicalSpecimenSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    surgery_code = serializers.CharField(source="surgery.custom_id", read_only=True)
    patient_name = serializers.CharField(source="patient.name", read_only=True)
    responsible_name = serializers.CharField(source="responsible.name", read_only=True)
    pathology_request_code = serializers.CharField(source="pathology_request.custom_id", read_only=True)
    legacy_input_aliases = {
        **BASE_ALIASES,
        "cirurgia": "surgery",
        "paciente": "patient",
        "tipo_amostra": "specimen_type",
        "local_anatomico": "anatomical_site",
        "local_anatómico": "anatomical_site",
        "colhida_em": "collected_at",
        "fixador": "fixative",
        "fixador_usado": "fixative",
        "responsavel": "responsible",
        "responsável": "responsible",
        "pedido_patologia": "pathology_request",
    }
    legacy_output_aliases = legacy_input_aliases

    class Meta:
        model = SurgicalSpecimen
        fields = "__all__"
        read_only_fields = (
            *CORE_READ_ONLY_FIELDS,
            "surgery_code",
            "patient_name",
            "responsible_name",
            "pathology_request_code",
        )


SERIALIZER_MAP = {
    "pedido_cirurgico": SurgicalRequestSerializer,
    "avaliacao_pre_operatoria": PreoperativeAssessmentSerializer,
    "surgery": SurgerySerializer,
    "small_surgery": SmallSurgerySerializer,
    "large_surgery": LargeSurgerySerializer,
    "surgical_procedure": SurgicalProcedureSerializer,
    "procedimentos_realizados": SurgeryProcedureItemSerializer,
    "agenda_cirurgica": SurgicalScheduleSerializer,
    "centro_cirurgico": OperatingRoomSerializer,
    "equipa_cirurgica": SurgicalTeamMemberSerializer,
    "anestesia": AnesthesiaRecordSerializer,
    "checklist_seguranca": SurgicalSafetyChecklistSerializer,
    "materiais": SurgicalMaterialSerializer,
    "consumos": SurgicalConsumptionSerializer,
    "recuperacao": RecoveryRecordSerializer,
    "relatorio_operatorio": OperativeReportSerializer,
    "autorizacoes": SurgicalAuthorizationSerializer,
    "faturacao": SurgicalBillingItemSerializer,
    "documentos": SurgicalDocumentSerializer,
    "auditoria": SurgicalAuditEventSerializer,
    "amostras": SurgicalSpecimenSerializer,
}
