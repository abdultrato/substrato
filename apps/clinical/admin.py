"""Configuração do Django Admin para módulos clínicos."""

import unicodedata

from django.contrib import admin, messages
from django.core.exceptions import PermissionDenied
from django.http import Http404, HttpResponse
from django.shortcuts import redirect
from django.urls import path, reverse
from django.utils.html import format_html
from django.utils.safestring import mark_safe

from .forms_admin import ResultItemInlineFormSet
from .models.lab_exam import LabExam
from .models.lab_exam_field import LabExamField
from .models.lab_request import LabRequest
from .models.lab_request_item import LabRequestItem
from .models.medical_exam import MedicalExam, MedicalExamField
from .models.patient import Patient
from .models.result import Result
from .models.result_item import ResultItem
from .models.sample import Sample

# =========================================================
# RBAC HELPERS (DJANGO ADMIN)
# =========================================================


def _normalize_group(value: str) -> str:
    value = (value or "").strip().lower()
    if not value:
        return ""
    value = unicodedata.normalize("NFD", value)
    return "".join(ch for ch in value if unicodedata.category(ch) != "Mn")


def _user_has_any_group(user, group_names: list[str]) -> bool:
    if not user or not getattr(user, "is_authenticated", False):
        return False
    if getattr(user, "is_superuser", False):
        return True
    try:
        raw = list(user.groups.values_list("name", flat=True))
    except Exception:
        raw = []
    have = {_normalize_group(x) for x in raw if x}
    return any(_normalize_group(g) in have for g in (group_names or []))


# =========================================================
# BASE ADMIN
# =========================================================


class CoreAdmin(admin.ModelAdmin):
    """Base comum com ordenação e campos somente leitura."""
    search_fields = ("custom_id",)
    readonly_fields = ("created_at", "updated_at")
    ordering = ("-created_at",)
    list_per_page = 50


# =========================================================
# AMOSTRA
# =========================================================


@admin.register(Sample)
class SampleAdmin(CoreAdmin):
    """Catálogo de amostras biológicas e parâmetros de coleta."""

    list_display = (
        "custom_id",
        "name",
        "bottle_type",
        "minimum_volume_ml",
        "fasting_required",
        "fasting_hours",
        "storage_temperature",
    )

    search_fields = (
        "custom_id",
        "name",
        "bottle_type",
        "cap_color",
        "anticoagulant",
    )

    list_filter = (
        "bottle_type",
        "fasting_required",
    )

    ordering = ("name",)
    list_per_page = 50

    readonly_fields = (
        "custom_id",
        "version",
        "created_at",
        "created_by",
        "created_by_id",
        "updated_at",
        "updated_by",
        "deleted_at",
        "deleted_by",
        "deleted_by_id",
    )

    fieldsets = (
        (
            "Identificação da Amostra",
            {
                "fields": (
                    "tenant",
                    "custom_id",
                    "name",
                    "bottle_type",
                    "cap_color",
                )
            },
        ),
        (
            "Parâmetros de Coleta",
            {
                "fields": (
                    "minimum_volume_ml",
                    "fasting_required",
                    "fasting_hours",
                    "anticoagulant",
                    "collection_instructions",
                )
            },
        ),
        (
            "Conservação",
            {
                "fields": (
                    "storage_temperature",
                    "stability_hours",
                )
            },
        ),
        (
            "Auditoria",
            {
                "classes": ("collapse",),
                "fields": (
                    "created_at",
                    "created_by",
                    "created_by_id",
                    "updated_at",
                    "updated_by",
                    "version",
                    "deleted_at",
                    "deleted_by",
                    "deleted_by_id",
                ),
            },
        ),
    )

# =========================================================
# PACIENTE
# =========================================================


@admin.register(Patient)
class PatientAdmin(admin.ModelAdmin):
    """Administra pacientes com filtros por documento e gênero."""
    list_display = (
        "custom_id",
        "name",
        "document_number",
        "gender",
        "idade",
        "contact",
    )

    search_fields = (
        "custom_id",
        "name",
        "document_number",
        "contact",
        "email",
    )

    list_filter = (
        "gender",
        "provenance",
        "pregnant",
    )

    ordering = ("name",)

    list_per_page = 50

    readonly_fields = (
        "custom_id",
        "idade",
        "version",
        "created_at",
        "created_by",
        "created_by_id",
        "updated_at",
        "updated_by",
        "deleted_at",
        "deleted_by",
        "deleted_by_id",
    )

    fieldsets = (
        (
            "Identificação do Paciente",
            {
                "fields": (
                    "tenant",
                    "custom_id",
                    "name",
                    "document_type",
                    "document_number",
                )
            },
        ),
        (
            "Dados Demográficos",
            {
                "fields": (
                    "birth_date",
                    "idade",
                    "gender",
                    "race_origin",
                )
            },
        ),
        (
            "Contacto e Morada",
            {
                "fields": (
                    "contact",
                    "email",
                    "address_street",
                    "address_number",
                    "address_neighborhood",
                    "address_city",
                    "address_province",
                    "address_postal_code",
                    "address_country",
                    "address_complement",
                    "address",
                )
            },
        ),
        (
            "Informações Clínicas",
            {
                "fields": (
                    "pregnant",
                    "gestational_age_weeks",
                    "provenance",
                )
            },
        ),
        (
            "Auditoria",
            {
                "classes": ("collapse",),
                "fields": (
                    "created_at",
                    "created_by",
                    "created_by_id",
                    "updated_at",
                    "updated_by",
                    "version",
                    "deleted_at",
                    "deleted_by",
                    "deleted_by_id",
                ),
            },
        ),
    )


# =========================================================
# EXAME CAMPO
# =========================================================


@admin.register(LabExamField)
class LabExamFieldAdmin(CoreAdmin):
    """Administra campos de exame (componentes do painel de resultados)."""
    list_display = (
        "custom_id",
        "position",
        "name",
        "exam",
        "type",
        "unit",
        "reference",
    )

    search_fields = (
        "custom_id",
        "name",
        "exam__name",
    )

    list_filter = (
        "type",
        "exam",
    )

    autocomplete_fields = ("exam",)

    list_select_related = ("exam",)

    ordering = ("exam", "position", "name")

    list_per_page = 50

    readonly_fields = (
        "custom_id",
        "version",
        "created_at",
        "created_by",
        "created_by_id",
        "updated_at",
        "updated_by",
        "deleted_at",
        "deleted_by",
        "deleted_by_id",
    )

    fieldsets = (
        (
            "Identificação do Parâmetro",
            {
                "fields": (
                    "tenant",
                    "custom_id",
                    "position",
                    "name",
                    "exam",
                )
            },
        ),
        (
            "Configuração do Resultado",
            {
                "fields": (
                    "type",
                    "unit",
                )
            },
        ),
        (
            "Valores de Referência",
            {
                "fields": (
                    "reference_min",
                    "reference_max",
                    "critical_min",
                    "critical_max",
                )
            },
        ),
        (
            "Auditoria",
            {
                "classes": ("collapse",),
                "fields": (
                    "created_at",
                    "created_by",
                    "created_by_id",
                    "updated_at",
                    "updated_by",
                    "version",
                    "deleted_at",
                    "deleted_by",
                    "deleted_by_id",
                ),
            },
        ),
    )

    # =====================================================
    # REFERÊNCIA FORMATADA
    # =====================================================

    def reference(self, obj):

        min_ref = obj.reference_min
        max_ref = obj.reference_max

        if min_ref is not None and max_ref is not None:
            return f"{min_ref} - {max_ref}"

        if min_ref is not None:
            return f"≥ {min_ref}"

        if max_ref is not None:
            return f"≤ {max_ref}"

        return "-"

    reference.short_description = "Referência"


# =========================================================
# EXAME CAMPO INLINE
# =========================================================


class LabExamFieldInline(admin.TabularInline):
    """Inline para gerenciar campos dentro do cadastro de exame."""
    model = LabExamField

    extra = 0

    fields = (
        "tenant",
        "position",
        "name",
        "type",
        "unit",
        "reference_min",
        "reference_max",
        "critical_min",
        "critical_max",
        "max_delta",
    )

    ordering = ("name",)

    show_change_link = True

    verbose_name = "Parâmetro do exam"
    verbose_name_plural = "Parâmetros do exam"


# =========================================================
# EXAME
# =========================================================


@admin.register(LabExam)
class LabExamAdmin(CoreAdmin):
    """Catálogo de exames laboratoriais com inlines de campos."""
    list_display = (
        "custom_id",
        "name",
        "sample_type",
        "sample_options_summary",
        "sector",
        "method",
        "turnaround_hours",
        "price",
        "vat_percentage",
        "applies_vat_by_default",
    )

    search_fields = (
        "custom_id",
        "name",
        "sample_type__name",
        "sample_options__name",
    )

    list_filter = (
        "sample_type",
        "sample_options",
        "sector",
        "method",
    )

    ordering = ("name",)

    list_per_page = 50

    inlines = (LabExamFieldInline,)
    autocomplete_fields = ("sample_type", "sample_options")
    list_select_related = ("sample_type",)

    readonly_fields = (
        "custom_id",
        "version",
        "created_at",
        "created_by",
        "created_by_id",
        "updated_at",
        "updated_by",
        "deleted_at",
        "deleted_by",
        "deleted_by_id",
    )

    fieldsets = (
        (
            "Informações do Exame",
            {
                "fields": (
                    "tenant",
                    "custom_id",
                    "name",
                    "sample_type",
                    "sample_options",
                    "sector",
                    "method",
                )
            },
        ),
        (
            "Configuração Clínica",
            {
                "fields": (
                    "turnaround_hours",
                    "price",
                    "vat_percentage",
                    "applies_vat_by_default",
                )
            },
        ),
        (
            "Auditoria",
            {
                "classes": ("collapse",),
                "fields": (
                    "created_at",
                    "created_by",
                    "created_by_id",
                    "updated_at",
                    "updated_by",
                    "version",
                    "deleted_at",
                    "deleted_by",
                    "deleted_by_id",
                ),
            },
        ),
    )

    def sample_options_summary(self, obj):
        names = [sample.name for sample in obj.get_sample_options()]
        if not names:
            return "—"
        return ", ".join(names)

    sample_options_summary.short_description = "Opções de amostra"


# =========================================================
# EXAME MÉDICO
# =========================================================


class MedicalExamFieldInline(admin.TabularInline):
    """Inline de campos de exame médico (imagem/laudo)."""
    model = MedicalExamField
    extra = 0
    fields = (
        "tenant",
        "position",
        "name",
        "type",
    )
    ordering = ("position", "name")
    show_change_link = True
    verbose_name = "Parâmetro do exam médico"
    verbose_name_plural = "Parâmetros do exam médico"


@admin.register(MedicalExam)
class MedicalExamAdmin(CoreAdmin):
    """Administra exames médicos com campos e filtros de resultado."""
    list_display = (
        "custom_id",
        "name",
        "sector",
        "method",
        "turnaround_hours",
        "price",
        "vat_percentage",
        "applies_vat_by_default",
    )

    search_fields = (
        "custom_id",
        "name",
    )

    list_filter = (
        "sector",
        "method",
    )

    ordering = ("name",)

    list_per_page = 50

    inlines = (MedicalExamFieldInline,)

    readonly_fields = (
        "custom_id",
        "version",
        "created_at",
        "created_by",
        "created_by_id",
        "updated_at",
        "updated_by",
        "deleted_at",
        "deleted_by",
        "deleted_by_id",
    )

    fieldsets = (
        (
            "Informações do Exame Médico",
            {
                "fields": (
                    "tenant",
                    "custom_id",
                    "name",
                    "sector",
                    "method",
                )
            },
        ),
        (
            "Configuração Clínica",
            {
                "fields": (
                    "turnaround_hours",
                    "price",
                    "vat_percentage",
                    "applies_vat_by_default",
                )
            },
        ),
        (
            "Auditoria",
            {
                "classes": ("collapse",),
                "fields": (
                    "created_at",
                    "created_by",
                    "created_by_id",
                    "updated_at",
                    "updated_by",
                    "version",
                    "deleted_at",
                    "deleted_by",
                    "deleted_by_id",
                ),
            },
        ),
    )


# =========================================================
# REQUISIÇÃO ITEM INLINE
# =========================================================


class RequestLabItemInline(admin.TabularInline):
    """Inline de itens de exame lab dentro da requisição."""
    model = LabRequestItem
    extra = 1

    autocomplete_fields = ("exam",)

    fields = ("position", "exam")
    ordering = ("position", "id")

    def get_queryset(self, request):
        return super().get_queryset(request).filter(exam__isnull=False)


class RequestMedicalItemInline(admin.TabularInline):
    """Inline de itens de exame médico na requisição."""
    model = LabRequestItem
    extra = 1

    autocomplete_fields = ("medical_exam",)

    fields = ("position", "medical_exam")
    ordering = ("position", "id")

    def get_queryset(self, request):
        return super().get_queryset(request).filter(medical_exam__isnull=False)


# =========================================================
# REQUISIÇÃO
# =========================================================


@admin.register(LabRequest)
class LabRequestAdmin(CoreAdmin):
    """Administra requisições de exames (lab e médico) com inlines."""
    list_display = (
        "custom_id",
        "patient",
        "type",
        "samples_summary",
        "requires_fasting",
        "fasting_hours",
        "status",
        "clinical_status",
        "created_at",
    )

    search_fields = (
        "custom_id",
        "patient__name",
    )

    list_filter = (
        "clinical_status",
        "status",
        "requires_fasting",
    )

    autocomplete_fields = (
        "patient",
        "analyst",
    )

    list_select_related = (
        "patient",
        "analyst",
    )

    ordering = ("-created_at",)

    list_per_page = 50

    readonly_fields = (
        "custom_id",
        "samples_summary",
        "requires_fasting",
        "fasting_hours",
        "created_at",
        "created_by_id",
        "created_by",
        "updated_by",
        "deleted_at",
        "deleted_by_id",
        "deleted_by",
        "version",
    )

    # Inlines são escolhidos dinamicamente (por type/sector).
    inlines: tuple = ()

    # =====================================================
    # FIELDSETS
    # =====================================================

    fieldsets = (
        (
            "Identificação da Requisição",
            {
                "fields": (
                    "tenant",
                    "custom_id",
                )
            },
        ),
        (
            "Informações Clínicas",
            {
                "fields": (
                    "patient",
                    "type",
                    "analyst",
                    "samples_summary",
                    "requires_fasting",
                    "fasting_hours",
                    "status",
                    "clinical_status",
                )
            },
        ),
        (
            "Auditoria",
            {
                "classes": ("collapse",),
                "fields": (
                    "created_at",
                    "created_by",
                    "created_by_id",
                    "updated_by",
                    "version",
                    "deleted_at",
                    "deleted_by",
                    "deleted_by_id",
                ),
            },
        ),
    )

    # =====================================================
    # UI POR PERFIL (RESTRIÇÕES DE LANÇAMENTO)
    # =====================================================

    def get_list_display(self, request):
        base = [
            "custom_id",
            "patient",
            "type",
            "samples_summary",
            "requires_fasting",
            "fasting_hours",
            "status",
            "clinical_status",
            "created_at",
        ]

        # "Lançar resultados" / PDF restrito a Administrador e Técnico de Laboratório.
        if _user_has_any_group(request.user, ["Administrador", "Técnico de Laboratório"]):
            base.insert(5, "launch_result")
            base.insert(6, "view_result_pdf")

        return tuple(base)

    def get_readonly_fields(self, request, obj=None):
        ro = list(super().get_readonly_fields(request, obj))
        # Tipo/sector só pode ser definido na criação.
        if obj is not None and "type" not in ro:
            ro.append("type")
        return tuple(ro)

    def get_inline_instances(self, request, obj=None):
        # Sempre permitir adicionar itens laboratoriais e médicos na mesma requisição.
        inline_classes = [RequestLabItemInline, RequestMedicalItemInline]
        return [inline_class(self.model, self.admin_site) for inline_class in inline_classes]

    # -----------------------------------------------------
    # LANÇAR RESULTADO
    # -----------------------------------------------------

    def launch_result(self, obj):

        result = obj.get_result()

        if not result:
            return "—"

        url = reverse(
            "admin:clinical_result_change",
            args=[result.id],
        )

        return format_html(
            '<a class="button" href="{}">Lançar resultados</a>',
            url,
        )

    launch_result.short_description = "Lançar result"
    # -----------------------------------------------------
    # PDF RESULTADO
    # -----------------------------------------------------

    def view_result_pdf(self, obj):

        if not hasattr(obj, "result"):
            return mark_safe('<span style="color:gray;">Ainda sem resultados</span>')

        result = obj.result
        itens = result.items.all()

        if not itens.exists():
            return mark_safe('<span style="color:gray;">Ainda sem resultados</span>')

        if itens.filter(critical_alert=True).exists():
            cor = "#c0392b"
            texto = "PDF Crítico"

        elif itens.filter(status="VALIDADO").count() != itens.count():
            cor = "#e67e22"
            texto = "PDF Parcial"

        else:
            cor = "#27ae60"
            texto = "PDF Final"

        url = reverse(
            "result_pdf",
            args=[obj.custom_id],
        )

        return format_html(
            '<a style="background:{};color:white;padding:4px 10px;border-radius:4px;text-decoration:none;" target="_blank" href="{}">{}</a>',
            cor,
            url,
            texto,
        )

    view_result_pdf.short_description = "Resultado PDF"

    def samples_summary(self, obj):
        names = list(obj.samples.values_list("name", flat=True))
        if not names:
            return "—"
        return ", ".join(names)

    samples_summary.short_description = "Amostras"

# =========================================================
# RESULTADO ITEM INLINE
# =========================================================


class ResultItemInlineAdmin(admin.TabularInline):
    """Inline de resultados individuais por campo de exame."""
    model = ResultItem
    formset = ResultItemInlineFormSet

    extra = 0
    can_delete = False

    fields = (
        "tenant",
        "position",
        "exam_name",
        "exam_field",
        "reference",
        "result_value",
        "colored_result",
        "status",
        "interpretation",
    )

    readonly_fields = (
        "exam_name",
        "position",
        "exam_field",
        "reference",
        "colored_result",
        "interpretation",
    )

    autocomplete_fields = ("exam_field",)

    # -----------------------------------------------------
    # QUERY OTIMIZADA
    # -----------------------------------------------------

    def get_queryset(self, request):

        qs = super().get_queryset(request)

        return qs.select_related(
            "exam_field",
            "exam_field__exam",
        ).order_by(
            "position",
            "exam_field__exam__name",
            "exam_field__name",
        )

    # -----------------------------------------------------
    # EXAME
    # -----------------------------------------------------

    def exam_name(self, obj):

        campo = getattr(obj, "exam_field", None)

        if campo and campo.exam:
            return format_html("<strong>{}</strong>", campo.exam.name)

        return "-"

    exam_name.short_description = "Exame"

    # -----------------------------------------------------
    # REFERÊNCIA
    # -----------------------------------------------------

    def reference(self, obj):

        campo = getattr(obj, "exam_field", None)

        if not campo:
            return "-"

        return campo.referencia or "-"

    reference.short_description = "Referência"

    # -----------------------------------------------------
    # RESULTADO COLORIDO
    # -----------------------------------------------------

    def colored_result(self, obj):

        cor = obj.report_color or "#2c3e50"

        return format_html(
            "<strong style='color:{}'>{}</strong>",
            cor,
            obj.formatted_result_value,
        )

    colored_result.short_description = "Resultado"

    # -----------------------------------------------------
    # INTERPRETAÇÃO
    # -----------------------------------------------------

    def interpretation(self, obj):

        if not obj.clinical_status:
            return "-"

        cores = {
            "NORMAL": "#2c3e50",
            "BAIXO": "#2980b9",
            "ALTO": "#e67e22",
            "CRITICO_BAIXO": "#c0392b",
            "CRITICO_ALTO": "#c0392b",
        }

        cor = cores.get(obj.clinical_status, "#2c3e50")

        return format_html(
            "<strong style='color:{}'>{}</strong>",
            cor,
            obj.clinical_status,
        )

    interpretation.short_description = "Interpretação"


# =========================================================
# RESULTADO
# =========================================================


@admin.register(Result)
class ResultAdmin(CoreAdmin):
    """Administra resultados consolidados com itens e arquivos."""
    list_display = (
        "custom_id",
        "request",
        "analyst",
        "finalized",
        "created_at",
        "pdf_link",
    )

    search_fields = (
        "custom_id",
        "request__custom_id",
        "request__patient__name",
    )

    list_filter = (
        "finalized",
        "created_at",
    )

    list_select_related = (
        "request",
        "analyst",
    )

    raw_id_fields = (
        "request",
        "analyst",
    )

    ordering = ("-created_at",)

    list_per_page = 50

    readonly_fields = (
        "custom_id",
        "analyst",
        "pdf_link",
        "created_at",
        "created_by",
        "created_by_id",
        "updated_by",
        "updated_at",
        "deleted_at",
        "deleted_by",
        "deleted_by_id",
        "version",
    )

    inlines = (ResultItemInlineAdmin,)

    # =====================================================
    # FIELDSETS
    # =====================================================

    fieldsets = (
        (
            "Identificação do Resultado",
            {
                "fields": (
                    "tenant",
                    "custom_id",
                    "pdf_link",
                )
            },
        ),
        (
            "Informações da Requisição",
            {
                "fields": (
                    "request",
                    "analyst",
                    "finalized",
                )
            },
        ),
        (
            "Auditoria",
            {
                "classes": ("collapse",),
                "fields": (
                    "created_at",
                    "created_by",
                    "created_by_id",
                    "updated_at",
                    "updated_by",
                    "version",
                    "deleted_at",
                    "deleted_by",
                    "deleted_by_id",
                ),
            },
        ),
    )

    def get_urls(self):
        urls = super().get_urls()
        app_label = self.model._meta.app_label
        model_name = self.model._meta.model_name
        extra = [
            path(
                "<path:object_id>/pdf/",
                self.admin_site.admin_view(self.results_pdf_view),
                name=f"{app_label}_{model_name}_pdf",
            ),
        ]
        return extra + urls

    def pdf_link(self, obj):
        if not getattr(obj, "pk", None):
            return "-"
        app_label = self.model._meta.app_label
        model_name = self.model._meta.model_name
        url = reverse(f"admin:{app_label}_{model_name}_pdf", args=[obj.pk])
        return format_html('<a href="{}" target="_blank" rel="noopener">Gerar PDF</a>', url)

    pdf_link.short_description = "PDF"

    def results_pdf_view(self, request, object_id: str):
        result = self.get_object(request, object_id)
        if result is None:
            raise Http404("Resultado não encontrado.")
        if not self.has_view_permission(request, result):
            raise PermissionDenied("Sem permissão para ver este resultado.")

        req = getattr(result, "request", None)
        if not req:
            messages.error(request, "Este resultado não possui requisição associada.")
            return redirect(
                reverse(
                    f"admin:{self.model._meta.app_label}_{self.model._meta.model_name}_change",
                    args=[result.pk],
                )
            )

        from tasks.generate_pdf.result_pdf_generator import generate_results_pdf

        try:
            pdf_bytes, filename = generate_results_pdf(req, apenas_validados=True)
        except Exception as exc:
            messages.error(request, f"Falha ao gerar PDF: {exc}")
            return redirect(
                reverse(
                    f"admin:{self.model._meta.app_label}_{self.model._meta.model_name}_change",
                    args=[result.pk],
                )
            )

        resp = HttpResponse(pdf_bytes, content_type="application/pdf")
        resp["Content-Disposition"] = f'inline; filename="{filename}"'
        return resp
