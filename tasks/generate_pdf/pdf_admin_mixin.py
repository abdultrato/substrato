"""
PDF Admin Actions Mixin — Atalhos unificados para download de PDFs

Fornece um sistema reutilizável para adicionar ações de download de PDF
no Django Admin, com suporte a múltiplos tipos de documentos.

Uso:
    from .pdf_admin_mixin import PDFAdminMixin

    @admin.register(MyModel)
    class MyModelAdmin(PDFAdminMixin, admin.ModelAdmin):
        pdf_generator = generate_my_model_pdf
        pdf_filename_template = "documento_{pk}.pdf"
"""

from collections.abc import Callable
import logging

from django.contrib import messages
from django.http import FileResponse, HttpRequest, HttpResponse
from django.shortcuts import redirect
from django.urls import path, reverse
from django.utils.html import format_html
from django.utils.safestring import mark_safe

logger = logging.getLogger("pdf.admin")

PDF_ICON_SVG = """
<svg aria-hidden="true" class="substrato-pdf-icon" width="14" height="14"
     viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
     stroke-linecap="round" stroke-linejoin="round">
  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
  <path d="M14 2v6h6"/>
  <path d="M9 15h6"/>
  <path d="M9 18h3"/>
</svg>
"""


def pdf_action_content(label: str = "PDF", *, icon_html: str | None = None):
    """Renderiza o rótulo visual padrão para ações de geração/download de PDF."""
    return format_html("{}<span>{}</span>", mark_safe(icon_html or PDF_ICON_SVG), label)


def pdf_action_link(
    url: str,
    label: str = "Gerar PDF",
    *,
    title: str | None = None,
    css_class: str = "button substrato-pdf-action",
    icon_html: str | None = None,
    style: str | None = None,
    target_blank: bool = True,
):
    """Renderiza um link de PDF com ícone, acessível e consistente no Admin."""
    title_attr = format_html(' title="{}"', title or label)
    target_attr = format_html(' target="{}"', "_blank") if target_blank else ""
    rel_attr = format_html(' rel="{}"', "noopener") if target_blank else ""
    style_attr = format_html(' style="{}"', style) if style else ""
    return format_html(
        '<a class="{}" href="{}"{}{}{}{}>{}</a>',
        css_class,
        url,
        title_attr,
        target_attr,
        rel_attr,
        style_attr,
        pdf_action_content(label, icon_html=icon_html),
    )


class PDFAdminMixin:
    """
    Mixin para adicionar ações de download de PDF ao Django Admin.

    Atributos esperados na subclasse:
        pdf_generator: Callable que gera o PDF (retorna bytes, filename)
        pdf_filename_template: Template para nome do arquivo (ex: "doc_{pk}.pdf")
        pdf_action_label: Label do botão de ação (opcional)

    Exemplo:
        @admin.register(Invoice)
        class InvoiceAdmin(PDFAdminMixin, admin.ModelAdmin):
            pdf_generator = generate_invoice_pdf
            pdf_filename_template = "fatura_{pk}.pdf"
            pdf_action_label = "Baixar Fatura"
    """

    pdf_generator: Callable | None = None
    pdf_filename_template: str = "documento_{pk}.pdf"
    pdf_action_label: str = "Baixar PDF"
    pdf_icon_html: str = PDF_ICON_SVG

    def _get_pdf_generator(self) -> Callable | None:
        """Resolve o gerador de PDF efetivo para a requisição atual."""
        return self.pdf_generator

    def _invoke_pdf_generator(self, obj, request: HttpRequest | None = None):
        """
        Chama o gerador de PDF com compatibilidade para assinaturas legadas.

        Suporta geradores nos formatos:
        - generator(obj, request=None)
        - generator(obj)
        - generator(obj, req=None)  # segundo argumento posicional não nomeado "request"
        """
        generator = self._get_pdf_generator()
        if not generator:
            raise ValueError("Gerador de PDF não configurado.")

        try:
            return generator(obj, request=request)
        except TypeError as exc:
            message = str(exc)
            if "got multiple values for argument 'request'" in message:
                return generator(obj)
            if "unexpected keyword argument 'request'" in message:
                from inspect import Parameter, signature

                params = list(signature(generator).parameters.values())
                positional_params = [
                    param for param in params
                    if param.kind in (Parameter.POSITIONAL_ONLY, Parameter.POSITIONAL_OR_KEYWORD)
                ]
                if len(positional_params) <= 1:
                    return generator(obj)
                return generator(obj, request)
            raise

    def get_urls(self):
        """Adiciona URL customizada para download de PDF."""
        urls = super().get_urls()
        custom_urls = [
            path(
                "<int:pk>/download-pdf/",
                self.admin_site.admin_view(self.download_pdf_view),
                name=f"{self.model._meta.app_label}_{self.model._meta.model_name}_download_pdf",
            ),
        ]
        return custom_urls + urls

    def download_pdf_view(self, request: HttpRequest, pk: int) -> HttpResponse:
        """View para baixar PDF de um objeto específico."""
        try:
            obj = self.model.objects.get(pk=pk)
        except self.model.DoesNotExist:
            self.message_user(request, "Objeto não encontrado.", messages.ERROR)
            return redirect("admin:index")

        if not self._get_pdf_generator():
            self.message_user(
                request,
                "Gerador de PDF não configurado para este modelo.",
                messages.ERROR,
            )
            return redirect("admin:index")

        try:
            # Chamar gerador de PDF
            pdf_bytes, filename = self._invoke_pdf_generator(obj, request=request)

            # Preparar resposta
            response = FileResponse(
                iter([pdf_bytes]),
                content_type="application/pdf",
            )
            response["Content-Disposition"] = f'attachment; filename="{filename}"'

            logger.info(f"PDF gerado: {filename} (modelo: {self.model.__name__}, pk: {pk})")
            return response

        except Exception as e:
            logger.exception(f"Erro ao gerar PDF para {self.model.__name__} pk={pk}")
            self.message_user(
                request,
                f"Erro ao gerar PDF: {e!s}",
                messages.ERROR,
            )
            return redirect("admin:index")

    def download_pdf_action(self, request: HttpRequest, queryset):
        """Ação de admin para download de PDF de um objeto selecionado."""
        count = queryset.count()

        if count == 0:
            self.message_user(request, "Nenhum objeto selecionado.", messages.WARNING)
            return None

        if count > 1:
            self.message_user(
                request,
                "Selecione apenas um objeto para gerar PDF.",
                messages.WARNING,
            )
            return None

        obj = queryset.first()

        if not self._get_pdf_generator():
            self.message_user(
                request,
                "Gerador de PDF não configurado.",
                messages.ERROR,
            )
            return None

        try:
            pdf_bytes, filename = self._invoke_pdf_generator(obj, request=request)

            response = FileResponse(
                iter([pdf_bytes]),
                content_type="application/pdf",
            )
            response["Content-Disposition"] = f'attachment; filename="{filename}"'

            logger.info(f"PDF gerado (ação): {filename}")
            return response

        except Exception as e:
            logger.exception("Erro na ação de PDF")
            self.message_user(request, f"Erro ao gerar PDF: {e!s}", messages.ERROR)

    download_pdf_action.short_description = "Baixar PDF"

    @classmethod
    def register_pdf_generator(cls, generator_func: Callable, filename_template: str | None = None):
        """Decorator para registrar gerador de PDF."""
        def decorator(admin_class):
            admin_class.pdf_generator = generator_func
            if filename_template:
                admin_class.pdf_filename_template = filename_template
            return admin_class
        return decorator

    def get_pdf_button_html(self, obj) -> str:
        """Retorna HTML do botão de download de PDF."""
        if not self._get_pdf_generator() or not obj.pk:
            return "—"

        try:
            url = reverse(
                f"admin:{self.model._meta.app_label}_{self.model._meta.model_name}_download_pdf",
                args=[obj.pk],
            )
        except Exception:
            # Fallback para manter compatibilidade quando o resolver ainda não está pronto.
            url = f"/admin/{self.model._meta.app_label}/{self.model._meta.model_name}/{obj.pk}/download-pdf/"
        return pdf_action_link(
            url,
            "PDF",
            title=self.pdf_action_label or "Baixar PDF",
            icon_html=self.pdf_icon_html,
        )

    get_pdf_button_html.short_description = "Ação"

    def get_actions(self, request):
        """Adiciona ação de PDF se gerador estiver configurado."""
        actions = super().get_actions(request)
        if self._get_pdf_generator():
            action_label = self.pdf_action_label or "Baixar PDF"
            actions["download_pdf_action"] = (
                self.download_pdf_action,
                "download_pdf_action",
                action_label,
            )
        return actions


class SimplePDFAdminMixin(PDFAdminMixin):
    """
    Versão simplificada que automaticamente detecta e usa o gerador correto.

    Exemplo:
        @admin.register(Invoice)
        class InvoiceAdmin(SimplePDFAdminMixin, admin.ModelAdmin):
            pass  # Automaticamente usa generate_invoice_pdf
    """

    def _get_pdf_generator(self) -> Callable | None:
        """Resolve gerador sem mutar estado compartilhado do ModelAdmin."""
        return self.pdf_generator or self.get_pdf_generator()

    def get_pdf_generator(self):
        """Detecta automaticamente qual gerador usar baseado no modelo."""
        from .pdf_registry import PDF_GENERATORS_REGISTRY

        model_path = f"{self.model._meta.app_label}.{self.model._meta.model_name}"
        return PDF_GENERATORS_REGISTRY.get(model_path)


__all__ = [
    "PDFAdminMixin",
    "SimplePDFAdminMixin",
    "pdf_action_content",
    "pdf_action_link",
]
