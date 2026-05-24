"""
PDF Generators Registry — Mapeamento centralizado de models para geradores

Registra todos os geradores de PDF disponíveis, permitindo:
1. Lookups automáticos baseados no modelo
2. Integração simples com AdminMixin
3. Endpoints de API unificados
4. Tracking de quais PDFs estão disponíveis

Uso:
    from .pdf_registry import register_pdf_generator, PDF_GENERATORS_REGISTRY

    # Registrar um gerador
    register_pdf_generator(
        app_label="clinical",
        model_name="labrequest",
        generator=generate_lab_request_pdf,
        doc_type=DocumentType.REQUEST,
    )

    # Buscar gerador
    gen = PDF_GENERATORS_REGISTRY.get("clinical.labrequest")
    if gen:
        pdf_bytes, filename = gen(obj, request)
"""

from collections.abc import Callable
import logging

from .pdf_improvements import DocumentType

logger = logging.getLogger("pdf.registry")


class PDFGeneratorRegistry:
    """Registry centralizado de geradores de PDF."""

    def __init__(self):
        self._generators: dict[str, dict] = {}

    def register(
        self,
        app_label: str,
        model_name: str,
        generator: Callable,
        doc_type: str | None = None,
        description: str | None = None,
    ) -> None:
        """
        Registra um gerador de PDF.

        Args:
            app_label: Label da app (ex: 'clinical', 'pharmacy')
            model_name: Nome do model (ex: 'labrequest')
            generator: Função callable(obj, request=None) -> (bytes, filename)
            doc_type: Tipo de documento (DocumentType.*)
            description: Descrição legível
        """
        key = f"{app_label}.{model_name}"

        self._generators[key] = {
            "app_label": app_label,
            "model_name": model_name,
            "generator": generator,
            "doc_type": doc_type or DocumentType.LABORATORY_RESULT,
            "description": description or f"PDF for {model_name}",
        }

        logger.info(f"✓ PDF gerador registrado: {key} → {doc_type or 'default'}")

    def _candidate_keys(self, app_label: str, model_name: str | None = None) -> list[str]:
        """
        Resolve chaves candidatas com fallback por app.

        Ordem de busca:
        1) app.model (exato)
        2) app.__default__ (fallback explícito)
        3) app.app (compatibilidade com registros legados)
        """
        if model_name is None:
            if "." in app_label:
                app, _, model = app_label.partition(".")
            else:
                app, model = app_label, None
        else:
            app, model = app_label, model_name

        keys = []
        if model:
            keys.append(f"{app}.{model}")
        elif "." in app_label:
            keys.append(app_label)
        else:
            keys.append(app_label)
        keys.extend([f"{app}.__default__", f"{app}.{app}"])
        return keys

    def get(self, app_label: str, model_name: str | None = None) -> Callable | None:
        """
        Busca um gerador de PDF.

        Suporta dois formatos:
        - get("clinical", "labrequest") → gerador
        - get("clinical.labrequest") → gerador
        """
        for key in self._candidate_keys(app_label, model_name):
            entry = self._generators.get(key)
            if entry:
                return entry["generator"]
        return None

    def get_entry(self, app_label: str, model_name: str | None = None) -> dict | None:
        """Retorna entrada completa (generator + metadata)."""
        for key in self._candidate_keys(app_label, model_name):
            entry = self._generators.get(key)
            if entry:
                return entry
        return None

    def list_all(self) -> dict[str, dict]:
        """Retorna todos os geradores registrados."""
        return self._generators.copy()

    def list_by_app(self, app_label: str) -> dict[str, dict]:
        """Retorna geradores de uma app específica."""
        return {
            k: v for k, v in self._generators.items()
            if v["app_label"] == app_label
        }

    def list_by_doc_type(self, doc_type: str) -> dict[str, dict]:
        """Retorna geradores de um tipo de documento específico."""
        return {
            k: v for k, v in self._generators.items()
            if v["doc_type"] == doc_type
        }

    def exists(self, app_label: str, model_name: str | None = None) -> bool:
        """Verifica se um gerador está registrado."""
        return any(key in self._generators for key in self._candidate_keys(app_label, model_name))


# Instância global
PDF_GENERATORS_REGISTRY = PDFGeneratorRegistry()


def register_pdf_generator(
    app_label: str,
    model_name: str,
    generator: Callable,
    doc_type: str | None = None,
    description: str | None = None,
) -> Callable:
    """
    Decorator ou função para registrar um gerador de PDF.

    Como função:
        register_pdf_generator("clinical", "labrequest", generate_lab_request_pdf)

    Como decorator:
        @register_pdf_generator("clinical", "labrequest", doc_type=DocumentType.REQUEST)
        def generate_lab_request_pdf(obj, request=None):
            ...
    """
    def _register(gen):
        PDF_GENERATORS_REGISTRY.register(
            app_label=app_label,
            model_name=model_name,
            generator=gen,
            doc_type=doc_type,
            description=description,
        )
        return gen

    # Se generator é callable, registrar diretamente
    if callable(generator):
        return _register(generator)

    # Caso contrário, retornar decorator
    return _register


# =========================================================
# GERADORES PRÉ-REGISTRADOS
# =========================================================

def _register_builtin_generators():
    """Registra geradores padrão do sistema."""
    from django.apps import apps as django_apps

    from .generic_app_pdf_generator import generate_generic_app_pdf
    from .invoice_pdf_generator import generate_invoice_pdf
    from .pharmacy_reports_pdf_generator import (
        generate_pharmacy_movements_pdf,
    )
    from .procedure_pdf_generator import generate_procedure_pdf
    from .receipt_pdf_generator import generate_receipt_pdf
    from .request_pdf_generator import generate_request_pdf
    from .result_pdf_generator import generate_results_pdf

    def _lab_request_admin_generator(obj, request=None):
        # `generate_request_pdf` é legado e aceita apenas o objeto da requisição.
        return generate_request_pdf(obj)

    def _lab_result_admin_generator(obj, request=None):
        # `generate_results_pdf` legado não aceita kwarg `request`.
        return generate_results_pdf(obj)

    # Clínica
    PDF_GENERATORS_REGISTRY.register(
        app_label="clinical",
        model_name="labresult",
        generator=_lab_result_admin_generator,
        doc_type=DocumentType.LABORATORY_RESULT,
        description="Resultado de análises laboratoriais",
    )

    PDF_GENERATORS_REGISTRY.register(
        app_label="clinical",
        model_name="labrequest",
        generator=_lab_request_admin_generator,
        doc_type=DocumentType.REQUEST,
        description="Requisição de exames",
    )

    # Enfermagem
    PDF_GENERATORS_REGISTRY.register(
        app_label="nursing",
        model_name="procedure",
        generator=generate_procedure_pdf,
        doc_type=DocumentType.NURSING_PROCEDURE,
        description="Procedimento de enfermagem",
    )

    # Farmácia
    PDF_GENERATORS_REGISTRY.register(
        app_label="pharmacy",
        model_name="movement",
        generator=generate_pharmacy_movements_pdf,
        doc_type=DocumentType.PHARMACY_REPORT,
        description="Movimentos de farmácia",
    )

    # Faturação
    PDF_GENERATORS_REGISTRY.register(
        app_label="billing",
        model_name="invoice",
        generator=generate_invoice_pdf,
        doc_type=DocumentType.INVOICE,
        description="Fatura",
    )

    PDF_GENERATORS_REGISTRY.register(
        app_label="billing",
        model_name="receipt",
        generator=generate_receipt_pdf,
        doc_type=DocumentType.RECEIPT,
        description="Comprovante de pagamento",
    )

    domain_app_configs = {
        config.name.split(".")[-1]: config
        for config in django_apps.get_app_configs()
        if config.name.startswith("apps.")
    }

    def _build_generic_app_fallback(app_label: str):
        def _generator(obj, request=None):
            return generate_generic_app_pdf(obj, request=request, app_label=app_label)

        _generator.__name__ = f"generate_{app_label}_pdf"
        return _generator

    for app_label, app_config in sorted(domain_app_configs.items()):
        generator = _build_generic_app_fallback(app_label)
        app_verbose_name = ""
        if app_config is not None:
            app_verbose_name = str(getattr(app_config, "verbose_name", "") or "").strip()
        if not app_verbose_name:
            app_verbose_name = app_label.replace("_", " ").title()
        description = f"Documento de {app_verbose_name}"

        # Registro principal (compatibilidade com legados app.app)
        PDF_GENERATORS_REGISTRY.register(
            app_label=app_label,
            model_name=app_label,
            generator=generator,
            doc_type=DocumentType.LABORATORY_RESULT,
            description=description,
        )
        # Registro explicito de fallback app.__default__
        PDF_GENERATORS_REGISTRY.register(
            app_label=app_label,
            model_name="__default__",
            generator=generator,
            doc_type=DocumentType.LABORATORY_RESULT,
            description=f"{description} (default)",
        )

        alias_labels = set()
        if app_config is not None:
            runtime_label = str(getattr(app_config, "label", "") or "").strip()
            module_label = str(app_config.name.split(".")[-1]).strip()
            if runtime_label and runtime_label != app_label:
                alias_labels.add(runtime_label)
            if module_label and module_label != app_label:
                alias_labels.add(module_label)

        # Registro para labels customizados usados em runtime (pt-* e futuros aliases).
        for alias in sorted(alias_labels):
            PDF_GENERATORS_REGISTRY.register(
                app_label=alias,
                model_name="__default__",
                generator=generator,
                doc_type=DocumentType.LABORATORY_RESULT,
                description=f"{description} ({alias})",
            )

    logger.info(f"✓ {len(PDF_GENERATORS_REGISTRY.list_all())} geradores padrão registrados")


# Registrar automaticamente ao importar
_register_builtin_generators()


__all__ = [
    "PDF_GENERATORS_REGISTRY",
    "PDFGeneratorRegistry",
    "register_pdf_generator",
]
