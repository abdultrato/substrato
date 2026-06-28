"""Serializers DRF para recursos de Enfermagem na API v1."""

from rest_framework import serializers

from api.v1.compat import LegacyAliasSerializerMixin
from apps.nursing.models import (
    NursingEvolution,
    NursingPrescription,
    NursingRecord,
    NursingVitalSign,
    Procedure,
    ProcedureCatalog,
    ProcedureCatalogMaterial,
    ProcedureItem,
    ProcedureItemValue,
    ProcedureMaterial,
    ProcedureMaterialValue,
    Ward,
    WardAdmission,
    WardBed,
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
    "descricao": "description",
    "descrição": "description",
    "observacao": "observation",
    "observação": "observation",
    "observacoes": "observation",
    "observações": "observation",
    "notas": "notes",
    "nota": "notes",
    "ativo": "active",
    "ativa": "active",
    "active": "active",
    "estado": "status",
}

PATIENT_ALIASES = {
    "paciente": "patient",
    "utente": "patient",
    "doente": "patient",
    "patient": "patient",
}

WARD_CONTEXT_ALIASES = {
    "enfermaria": "ward",
    "ala": "ward",
    "ward": "ward",
    "id_enfermaria": "ward",
    "enfermaria_id": "ward",
    "ward_id": "ward",
}

NURSING_RECORD_ALIASES = {
    **BASE_ALIASES,
    **PATIENT_ALIASES,
    **WARD_CONTEXT_ALIASES,
    "requisicao": "lab_request",
    "requisição": "lab_request",
    "requisicao_laboratorial": "lab_request",
    "requisição_laboratorial": "lab_request",
    "pedido_laboratorial": "lab_request",
    "lab_request": "lab_request",
    "tipo": "record_kind",
    "tipo_registo": "record_kind",
    "tipo_registro": "record_kind",
    "tipo_de_registo": "record_kind",
    "tipo_de_registro": "record_kind",
    "record_kind": "record_kind",
    "origem": "origin_role",
    "perfil_origem": "origin_role",
    "perfil_de_origem": "origin_role",
    "origin_role": "origin_role",
    "prioridade": "priority",
    "priority": "priority",
    "guia_coleta": "collection_guidance",
    "guia_colheita": "collection_guidance",
    "orientacao_coleta": "collection_guidance",
    "orientação_coleta": "collection_guidance",
    "orientacao_colheita": "collection_guidance",
    "orientação_colheita": "collection_guidance",
    "collection_guidance": "collection_guidance",
}

VITAL_SIGN_ALIASES = {
    **BASE_ALIASES,
    **PATIENT_ALIASES,
    **WARD_CONTEXT_ALIASES,
    "registro": "record",
    "registo": "record",
    "record": "record",
    "temperatura": "temperature_c",
    "temperatura_c": "temperature_c",
    "temperature": "temperature_c",
    "temperature_c": "temperature_c",
    "pressao_arterial": "blood_pressure",
    "pressão_arterial": "blood_pressure",
    "pa": "blood_pressure",
    "blood_pressure": "blood_pressure",
    "fc": "heart_rate",
    "frequencia_cardiaca": "heart_rate",
    "frequência_cardíaca": "heart_rate",
    "heart_rate": "heart_rate",
    "fr": "respiratory_rate",
    "frequencia_respiratoria": "respiratory_rate",
    "frequência_respiratória": "respiratory_rate",
    "respiratory_rate": "respiratory_rate",
    "spo2": "oxygen_saturation",
    "saturacao": "oxygen_saturation",
    "saturação": "oxygen_saturation",
    "saturacao_oxigenio": "oxygen_saturation",
    "saturação_oxigénio": "oxygen_saturation",
    "oxygen_saturation": "oxygen_saturation",
    "coletado_em": "collected_at",
    "colhido_em": "collected_at",
    "collected_at": "collected_at",
}

NURSING_PRESCRIPTION_ALIASES = {
    **BASE_ALIASES,
    **PATIENT_ALIASES,
    **WARD_CONTEXT_ALIASES,
    "prescricao": "description",
    "prescrição": "description",
    "cuidados": "description",
    "cuidado": "description",
    "description": "description",
    "data_prescricao": "prescription_date",
    "data_prescrição": "prescription_date",
    "prescription_date": "prescription_date",
}

NURSING_EVOLUTION_ALIASES = {
    **BASE_ALIASES,
    **PATIENT_ALIASES,
    **WARD_CONTEXT_ALIASES,
    "evolucao": "observation",
    "evolução": "observation",
    "nota_evolucao": "observation",
    "nota_evolução": "observation",
    "observation": "observation",
    "data_evolucao": "evolution_date",
    "data_evolução": "evolution_date",
    "evolution_date": "evolution_date",
}

PROCEDURE_CATALOG_ALIASES = {
    **BASE_ALIASES,
    **WARD_CONTEXT_ALIASES,
    "codigo": "procedure_code",
    "código": "procedure_code",
    "codigo_procedimento": "procedure_code",
    "código_procedimento": "procedure_code",
    "procedure_code": "procedure_code",
    "preco": "default_price",
    "preço": "default_price",
    "preco_padrao": "default_price",
    "preço_padrão": "default_price",
    "default_price": "default_price",
    "iva": "vat_percentage",
    "vat": "vat_percentage",
    "vat_percentage": "vat_percentage",
    "aplica_iva": "applies_vat_by_default",
    "aplicar_iva": "applies_vat_by_default",
    "applies_vat_by_default": "applies_vat_by_default",
    "duracao_estimada": "estimated_duration_minutes",
    "duração_estimada": "estimated_duration_minutes",
    "duracao_minutos": "estimated_duration_minutes",
    "duração_minutos": "estimated_duration_minutes",
    "estimated_duration_minutes": "estimated_duration_minutes",
}

PROCEDURE_CATALOG_MATERIAL_ALIASES = {
    **BASE_ALIASES,
    **WARD_CONTEXT_ALIASES,
    "catalogo": "catalog",
    "catálogo": "catalog",
    "procedimento_catalogo": "catalog",
    "procedimento_catálogo": "catalog",
    "catalog": "catalog",
    "produto": "product",
    "material": "product",
    "product": "product",
    "quantidade": "default_quantity",
    "quantidade_padrao": "default_quantity",
    "quantidade_padrão": "default_quantity",
    "default_quantity": "default_quantity",
}

PROCEDURE_ALIASES = {
    **BASE_ALIASES,
    **PATIENT_ALIASES,
    **WARD_CONTEXT_ALIASES,
    "profissional": "professional",
    "profissionais": "professional",
    "enfermeiro": "professional",
    "enfermeiros": "professional",
    "professional": "professional",
    "data_realizacao": "performed_date",
    "data_realização": "performed_date",
    "realizado_em": "performed_date",
    "performed_date": "performed_date",
    "observacoes": "notes",
    "observações": "notes",
    "notes": "notes",
    "estado": "workflow_status",
    "estado_fluxo": "workflow_status",
    "workflow_status": "workflow_status",
    "estado_faturacao": "billing_status",
    "estado_facturacao": "billing_status",
    "estado_faturação": "billing_status",
    "estado_facturação": "billing_status",
    "billing_status": "billing_status",
    "materiais_selecionados": "selected_materials",
    "materiais_seleccionados": "selected_materials",
    "selected_materials": "selected_materials",
    "procedimentos_catalogo": "selected_catalogs",
    "procedimentos_catálogo": "selected_catalogs",
    "catalogos": "selected_catalogs",
    "catálogos": "selected_catalogs",
    "selected_catalogs": "selected_catalogs",
}

PROCEDURE_ITEM_ALIASES = {
    **BASE_ALIASES,
    **WARD_CONTEXT_ALIASES,
    "procedimento": "procedure",
    "procedure": "procedure",
    "catalogo": "catalog",
    "catálogo": "catalog",
    "catalog": "catalog",
    "descricao": "description",
    "descrição": "description",
    "servico": "description",
    "serviço": "description",
    "description": "description",
    "quantidade": "quantity",
    "quantity": "quantity",
    "realizado": "performed",
    "realizada": "performed",
    "performed": "performed",
    "estado": "execution_status",
    "estado_execucao": "execution_status",
    "estado_execução": "execution_status",
    "execution_status": "execution_status",
    "faturado": "billed",
    "facturado": "billed",
    "billed": "billed",
    "faturado_em": "billed_at",
    "facturado_em": "billed_at",
    "billed_at": "billed_at",
    "executado_em": "executed_at",
    "executed_at": "executed_at",
    "concluido_em": "completed_at",
    "concluído_em": "completed_at",
    "completed_at": "completed_at",
    "posicao": "position",
    "posição": "position",
    "position": "position",
}

PROCEDURE_ITEM_VALUE_ALIASES = {
    **BASE_ALIASES,
    **WARD_CONTEXT_ALIASES,
    "item": "item",
    "preco_unitario": "unit_price",
    "preço_unitário": "unit_price",
    "valor_unitario": "unit_price",
    "valor_unitário": "unit_price",
    "unit_price": "unit_price",
}

PROCEDURE_MATERIAL_ALIASES = {
    **BASE_ALIASES,
    **WARD_CONTEXT_ALIASES,
    "procedimento": "procedure",
    "procedure": "procedure",
    "item_procedimento": "procedure_item",
    "item_do_procedimento": "procedure_item",
    "procedure_item": "procedure_item",
    "produto": "product",
    "material": "product",
    "product": "product",
    "lote": "lot",
    "lot": "lot",
    "quantidade": "quantity",
    "quantity": "quantity",
    "movimento_estoque": "inventory_movement",
    "movimento_stock": "inventory_movement",
    "inventory_movement": "inventory_movement",
    "posicao": "position",
    "posição": "position",
    "position": "position",
}

PROCEDURE_MATERIAL_VALUE_ALIASES = {
    **BASE_ALIASES,
    **WARD_CONTEXT_ALIASES,
    "material": "material",
    "custo_unitario": "unit_cost",
    "custo_unitário": "unit_cost",
    "valor_unitario": "unit_cost",
    "valor_unitário": "unit_cost",
    "unit_cost": "unit_cost",
}

WARD_ALIASES = {
    **BASE_ALIASES,
    "enfermaria": "name",
    "ala": "name",
    "ward": "name",
}

WARD_BED_ALIASES = {
    **BASE_ALIASES,
    "enfermaria": "ward",
    "ala": "ward",
    "ward": "ward",
    "numero": "number",
    "número": "number",
    "cama": "number",
    "number": "number",
}

WARD_ADMISSION_ALIASES = {
    **BASE_ALIASES,
    **PATIENT_ALIASES,
    **WARD_CONTEXT_ALIASES,
    "cama": "bed",
    "bed": "bed",
    "horas_observacao": "estimated_observation_hours",
    "horas_observação": "estimated_observation_hours",
    "tempo_observacao": "estimated_observation_hours",
    "tempo_observação": "estimated_observation_hours",
    "estimated_observation_hours": "estimated_observation_hours",
    "data_internamento": "admission_date",
    "admission_date": "admission_date",
    "data_prevista_alta": "expected_discharge_date",
    "expected_discharge_date": "expected_discharge_date",
    "data_alta": "discharged_at",
    "discharged_at": "discharged_at",
    "proxima_medicacao_em": "next_medication_at",
    "próxima_medicação_em": "next_medication_at",
    "next_medication_at": "next_medication_at",
    "proxima_medicacao": "next_medication_description",
    "próxima_medicação": "next_medication_description",
    "next_medication_description": "next_medication_description",
    "internamento_ativo": "active",
}


class NursingRecordSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    legacy_input_aliases = NURSING_RECORD_ALIASES
    legacy_output_aliases = NURSING_RECORD_ALIASES

    patient_name = serializers.CharField(source="patient.name", read_only=True)
    ward_name = serializers.CharField(source="ward.name", read_only=True)
    lab_request_code = serializers.CharField(source="lab_request.custom_id", read_only=True)
    lab_request_status = serializers.CharField(source="lab_request.status", read_only=True)

    class Meta:
        model = NursingRecord
        fields = "__all__"
        read_only_fields = (
            *CORE_READ_ONLY_FIELDS,
            "patient_name",
            "ward_name",
            "lab_request_code",
            "lab_request_status",
            "record_date",
        )


class ProcedureCatalogSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    legacy_input_aliases = PROCEDURE_CATALOG_ALIASES
    legacy_output_aliases = PROCEDURE_CATALOG_ALIASES

    ward_name = serializers.CharField(source="ward.name", read_only=True)

    class Meta:
        model = ProcedureCatalog
        fields = "__all__"
        read_only_fields = (*CORE_READ_ONLY_FIELDS, "ward_name")


class ProcedureCatalogMaterialSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    legacy_input_aliases = PROCEDURE_CATALOG_MATERIAL_ALIASES
    legacy_output_aliases = PROCEDURE_CATALOG_MATERIAL_ALIASES

    ward_name = serializers.CharField(source="ward.name", read_only=True)

    class Meta:
        model = ProcedureCatalogMaterial
        fields = "__all__"
        read_only_fields = (*CORE_READ_ONLY_FIELDS, "ward_name", "default_unit_cost")


class ProcedureSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    legacy_input_aliases = PROCEDURE_ALIASES
    legacy_output_aliases = PROCEDURE_ALIASES

    patient_name = serializers.CharField(source="patient.name", read_only=True)
    ward_name = serializers.CharField(source="ward.name", read_only=True)
    professional_name = serializers.SerializerMethodField()
    professional_names = serializers.SerializerMethodField()
    workflow_status_display = serializers.CharField(source="get_workflow_status_display", read_only=True)
    billing_status_display = serializers.CharField(source="get_billing_status_display", read_only=True)
    items_count = serializers.IntegerField(source="itens.count", read_only=True)

    def _professional_names(self, obj):
        names = []
        for professional in obj.professional.all():
            full_name = ""
            if hasattr(professional, "get_full_name"):
                full_name = (professional.get_full_name() or "").strip()
            if not full_name:
                full_name = getattr(professional, "name", "") or getattr(professional, "username", "")
            names.append(full_name or str(professional.pk))
        return names

    def get_professional_names(self, obj):
        return self._professional_names(obj)

    def get_professional_name(self, obj):
        names = self._professional_names(obj)
        if not names:
            return ""
        return ", ".join(names)

    class Meta:
        model = Procedure
        fields = "__all__"
        read_only_fields = (
            *CORE_READ_ONLY_FIELDS,
            "patient_name",
            "ward_name",
            "professional_name",
            "professional_names",
            "workflow_status_display",
            "billing_status_display",
            "items_count",
            "services_subtotal",
            "materials_subtotal",
            "total",
            "billed_at",
            "executed_at",
            "completed_at",
        )


class ProcedureItemSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    legacy_input_aliases = PROCEDURE_ITEM_ALIASES
    legacy_output_aliases = PROCEDURE_ITEM_ALIASES

    ward_name = serializers.CharField(source="ward.name", read_only=True)
    value_unitario = serializers.DecimalField(
        source="value.unit_price",
        max_digits=14,
        decimal_places=2,
        read_only=True,
    )
    catalog_name = serializers.CharField(source="catalog.name", read_only=True)
    catalog_code = serializers.CharField(source="catalog.procedure_code", read_only=True)
    procedure_code = serializers.CharField(source="procedure.custom_id", read_only=True)
    patient_name = serializers.CharField(source="procedure.patient.name", read_only=True)
    execution_status_display = serializers.CharField(source="get_execution_status_display", read_only=True)

    class Meta:
        model = ProcedureItem
        exclude = ("unit_price",)
        read_only_fields = (
            *CORE_READ_ONLY_FIELDS,
            "ward_name",
            "value_unitario",
            "catalog_name",
            "catalog_code",
            "procedure_code",
            "patient_name",
            "execution_status_display",
        )


class ProcedureMaterialSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    legacy_input_aliases = PROCEDURE_MATERIAL_ALIASES
    legacy_output_aliases = PROCEDURE_MATERIAL_ALIASES

    procedure_code = serializers.CharField(source="procedure.custom_id", read_only=True)
    product_name = serializers.CharField(source="product.name", read_only=True)
    product_type = serializers.CharField(source="product.get_type_display", read_only=True)
    lot_number = serializers.CharField(source="lot.lot_number", read_only=True)
    ward_name = serializers.CharField(source="ward.name", read_only=True)
    value_unitario = serializers.SerializerMethodField()

    def get_value_unitario(self, obj):
        try:
            value = obj.value.unit_cost
        except ProcedureMaterialValue.DoesNotExist:
            value = obj.unit_cost
        return str(value or "0.00")

    class Meta:
        model = ProcedureMaterial
        exclude = ("unit_cost",)
        read_only_fields = (
            *CORE_READ_ONLY_FIELDS,
            "procedure_code",
            "product_name",
            "product_type",
            "lot_number",
            "ward_name",
            "value_unitario",
        )


class ProcedureItemValueSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    legacy_input_aliases = PROCEDURE_ITEM_VALUE_ALIASES
    legacy_output_aliases = PROCEDURE_ITEM_VALUE_ALIASES

    ward_name = serializers.CharField(source="ward.name", read_only=True)

    class Meta:
        model = ProcedureItemValue
        fields = "__all__"
        read_only_fields = (*CORE_READ_ONLY_FIELDS, "ward_name")


class ProcedureMaterialValueSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    legacy_input_aliases = PROCEDURE_MATERIAL_VALUE_ALIASES
    legacy_output_aliases = PROCEDURE_MATERIAL_VALUE_ALIASES

    ward_name = serializers.CharField(source="ward.name", read_only=True)

    class Meta:
        model = ProcedureMaterialValue
        fields = "__all__"
        read_only_fields = (*CORE_READ_ONLY_FIELDS, "ward_name")


class NursingVitalSignSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    legacy_input_aliases = VITAL_SIGN_ALIASES
    legacy_output_aliases = VITAL_SIGN_ALIASES

    ward_name = serializers.CharField(source="ward.name", read_only=True)

    class Meta:
        model = NursingVitalSign
        fields = "__all__"
        read_only_fields = (*CORE_READ_ONLY_FIELDS, "ward_name")


class NursingPrescriptionSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    legacy_input_aliases = NURSING_PRESCRIPTION_ALIASES
    legacy_output_aliases = NURSING_PRESCRIPTION_ALIASES

    ward_name = serializers.CharField(source="ward.name", read_only=True)

    class Meta:
        model = NursingPrescription
        fields = "__all__"
        read_only_fields = (*CORE_READ_ONLY_FIELDS, "ward_name", "prescription_date")


class NursingEvolutionSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    legacy_input_aliases = NURSING_EVOLUTION_ALIASES
    legacy_output_aliases = NURSING_EVOLUTION_ALIASES

    ward_name = serializers.CharField(source="ward.name", read_only=True)
    patient_name = serializers.CharField(source="patient.name", read_only=True)

    class Meta:
        model = NursingEvolution
        fields = "__all__"
        read_only_fields = (*CORE_READ_ONLY_FIELDS, "ward_name", "patient_name", "evolution_date")


class WardSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    legacy_input_aliases = WARD_ALIASES
    legacy_output_aliases = WARD_ALIASES

    class Meta:
        model = Ward
        fields = "__all__"
        read_only_fields = CORE_READ_ONLY_FIELDS


class WardBedSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    legacy_input_aliases = WARD_BED_ALIASES
    legacy_output_aliases = WARD_BED_ALIASES

    ward_name = serializers.CharField(source="ward.name", read_only=True)

    class Meta:
        model = WardBed
        fields = "__all__"
        read_only_fields = (*CORE_READ_ONLY_FIELDS, "ward_name")


class WardAdmissionSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    legacy_input_aliases = WARD_ADMISSION_ALIASES
    legacy_output_aliases = WARD_ADMISSION_ALIASES

    patient_name = serializers.CharField(source="patient.name", read_only=True)
    bed_number = serializers.CharField(source="bed.number", read_only=True)
    ward_name = serializers.CharField(source="ward.name", read_only=True)

    class Meta:
        model = WardAdmission
        fields = "__all__"
        read_only_fields = (*CORE_READ_ONLY_FIELDS, "patient_name", "bed_number", "ward_name")


SERIALIZER_MAP = {
    "nursing_evolution": NursingEvolutionSerializer,
    "procedure_catalog": ProcedureCatalogSerializer,
    "procedure_catalog_material": ProcedureCatalogMaterialSerializer,
    "procedure": ProcedureSerializer,
    "procedure_item": ProcedureItemSerializer,
    "procedure_item_value": ProcedureItemValueSerializer,
    "procedure_material": ProcedureMaterialSerializer,
    "procedure_material_value": ProcedureMaterialValueSerializer,
    "nursing_prescription": NursingPrescriptionSerializer,
    "nursing_record": NursingRecordSerializer,
    "nursing_vital_sign": NursingVitalSignSerializer,
    "ward": WardSerializer,
    "ward_bed": WardBedSerializer,
    "ward_admission": WardAdmissionSerializer,
}
