"""
Exemplo Prático: Integração de Atalhos PDF em apps/clinical/admin.py

Este arquivo mostra como integrar SimplePDFAdminMixin em uma app real,
com todos os details de configuração do Django Admin.
"""

from django.contrib import admin
from django.utils.html import format_html

# 1. Importar o mixin
from tasks.generate_pdf import PDFAdminMixin, SimplePDFAdminMixin, generate_results_pdf

# 2. Importar os models
from .models import Consultation, LabRequest, LabResult, Patient

# ============================================================
# EXEMPLO 1: SimplePDFAdminMixin - Auto-detect (RECOMENDADO)
# ============================================================


@admin.register(LabRequest)
class LabRequestAdmin(SimplePDFAdminMixin, admin.ModelAdmin):
    """
    Admin de Requisição de Exames com PDF automático.

    O mixin procura automaticamente por:
    - PDF_GENERATORS_REGISTRY["clinical.labrequest"]

    Se encontrado, adiciona:
    - Botão "Download PDF" no list view
    - Ação "⬇ Baixar PDF" no dropdown
    - URL /admin/clinical/labrequest/{pk}/download-pdf/
    """

    list_display = [
        "id",
        "patient",
        "doctor",
        "created_at",
        "get_pdf_button_html",  # ← Botão de PDF
    ]

    list_filter = [
        "created_at",
        "status",
        "tenant",
    ]

    search_fields = [
        "patient__name",
        "doctor__name",
        "id",
    ]

    readonly_fields = [
        "created_at",
        "updated_at",
        "get_pdf_button_html",  # ← Tornar visível no change view
    ]

    fieldsets = (
        ("Informações Gerais", {
            "fields": ("id", "patient", "doctor", "status", "created_at", "updated_at")
        }),
        ("Exames Solicitados", {
            "fields": ("tests_requested",),
        }),
        ("PDF", {
            "fields": ("get_pdf_button_html",),
            "classes": ("collapse",),
        }),
    )

    date_hierarchy = "created_at"


@admin.register(LabResult)
class LabResultAdmin(SimplePDFAdminMixin, admin.ModelAdmin):
    """Admin de Resultado de Exames com PDF automático."""

    list_display = [
        "id",
        "request",
        "created_at",
        "status",
        "get_pdf_button_html",
    ]

    list_filter = [
        "created_at",
        "status",
        "test_type",
    ]

    search_fields = [
        "request__patient__name",
        "test_type",
    ]

    readonly_fields = [
        "created_at",
        "updated_at",
        "get_pdf_button_html",
    ]

    fieldsets = (
        ("Resultado", {
            "fields": ("request", "test_type", "result_value", "unit", "reference_range")
        }),
        ("Status", {
            "fields": ("status", "created_at", "updated_at")
        }),
        ("PDF", {
            "fields": ("get_pdf_button_html",),
        }),
    )


@admin.register(Patient)
class PatientAdmin(SimplePDFAdminMixin, admin.ModelAdmin):
    """Admin de Paciente com PDF automático (histórico)."""

    list_display = [
        "id",
        "name",
        "cpf",
        "created_at",
        "get_pdf_button_html",
    ]

    list_filter = [
        "created_at",
        "gender",
        "status",
    ]

    search_fields = [
        "name",
        "cpf",
        "email",
    ]

    readonly_fields = [
        "created_at",
        "updated_at",
        "get_pdf_button_html",
    ]

    fieldsets = (
        ("Dados Pessoais", {
            "fields": ("name", "date_of_birth", "gender", "cpf")
        }),
        ("Contato", {
            "fields": ("email", "phone", "address")
        }),
        ("Sistema", {
            "fields": ("created_at", "updated_at"),
            "classes": ("collapse",),
        }),
        ("PDF Histórico", {
            "fields": ("get_pdf_button_html",),
        }),
    )


# ============================================================
# EXEMPLO 2: PDFAdminMixin - Customizado Manualmente
# ============================================================

@admin.register(Consultation)
class ConsultationAdmin(PDFAdminMixin, admin.ModelAdmin):
    """
    Admin de Consulta com gerador de PDF customizado.

    Aqui especificamos manualmente qual gerador usar.
    """

    # Configurar qual gerador usar
    pdf_generator = generate_results_pdf  # Reutilizar gerador existente
    pdf_filename_template = "consulta_{pk}.pdf"
    pdf_action_label = "📝 Gerar Resumo (PDF)"
    pdf_icon_html = "📄"

    list_display = [
        "id",
        "patient",
        "doctor",
        "date",
        "status",
        "get_pdf_button_html",
    ]

    readonly_fields = [
        "created_at",
        "get_pdf_button_html",
    ]


# ============================================================
# EXEMPLO 3: Admin Inline com PDF
# ============================================================


class LabResultInline(admin.TabularInline):
    """Inline para Resultados dentro de Requisição."""
    model = LabResult
    extra = 1
    fields = ["test_type", "result_value", "unit", "status"]
    readonly_fields = ["created_at"]


# Adicionar inline ao admin de LabRequest
LabRequestAdmin.inlines = [LabResultInline]


# ============================================================
# EXEMPLO 4: Customizações Avançadas
# ============================================================


@admin.register(LabRequest)
class AdvancedLabRequestAdmin(SimplePDFAdminMixin, admin.ModelAdmin):
    """
    Exemplo com customizações avançadas.
    """

    list_display = [
        "id",
        "patient",
        "doctor",
        "status_badge",
        "created_at",
        "get_pdf_button_html",
    ]

    # Adicionar filters mais sofisticados
    list_filter = [
        ("created_at", admin.DateFieldListFilter),
        ("status", admin.ChoicesFieldListFilter),
    ]

    # Adicionar ações customizadas
    actions = ["mark_as_completed", "mark_as_cancelled"]

    def mark_as_completed(self, request, queryset):
        """Ação: Marcar como completado."""
        updated = queryset.update(status="completed")
        self.message_user(request, f"{updated} requisições marcadas como completadas.")

    mark_as_completed.short_description = "✓ Marcar como completado"

    def mark_as_cancelled(self, request, queryset):
        """Ação: Marcar como cancelado."""
        updated = queryset.update(status="cancelled")
        self.message_user(request, f"{updated} requisições canceladas.")

    mark_as_cancelled.short_description = "✗ Cancelar"

    def status_badge(self, obj):
        """Mostrar status como badge colorido."""
        colors = {
            "pending": "#FFA500",
            "completed": "#00AA00",
            "cancelled": "#FF0000",
        }
        color = colors.get(obj.status, "#999999")
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 10px; '
            'border-radius: 3px;">{}</span>',
            color,
            obj.get_status_display(),
        )

    status_badge.short_description = "Status"


# ============================================================
# Explicação de Como Funciona
# ============================================================

"""
FLUXO DE FUNCIONAMENTO:

1. Usuário clica no botão "Download PDF" no admin

2. SimplePDFAdminMixin chama get_pdf_generator():
   - Procura por PDF_GENERATORS_REGISTRY["clinical.labrequest"]
   - Se encontrado, usa aquele gerador

3. O gerador cria o PDF:
   - Lê dados do objeto (LabRequest)
   - Acessa tenant_name (auto-detecta de patient.tenant)
   - Usa DocumentType.REQUEST para cores/headers
   - Retorna (pdf_bytes, filename)

4. O mixin retorna FileResponse com o PDF

5. Browser faz download do arquivo

URLS GERADAS:
- /admin/clinical/labrequest/{pk}/download-pdf/
- Ação no dropdown: "⬇ Baixar PDF"
- Botão no list view: get_pdf_button_html

CUSTOMIZAÇÕES:
- pdf_filename_template: Mudar nome do arquivo
- pdf_action_label: Mudar label da ação
- pdf_icon_html: Mudar ícone do botão
- pdf_generator: Specify gerador manualmente (PDFAdminMixin)
"""
