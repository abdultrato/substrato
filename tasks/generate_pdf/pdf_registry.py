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

import logging
from typing import Callable, Dict, Optional

from .pdf_improvements import DocumentType

logger = logging.getLogger("pdf.registry")


class PDFGeneratorRegistry:
    """Registry centralizado de geradores de PDF."""
    
    def __init__(self):
        self._generators: Dict[str, dict] = {}
    
    def register(
        self,
        app_label: str,
        model_name: str,
        generator: Callable,
        doc_type: str = None,
        description: str = None,
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
    
    def get(self, app_label: str, model_name: str = None) -> Optional[Callable]:
        """
        Busca um gerador de PDF.
        
        Suporta dois formatos:
        - get("clinical", "labrequest") → gerador
        - get("clinical.labrequest") → gerador
        """
        if model_name is None:
            # Formato "app.model"
            key = app_label
        else:
            # Formato app, model
            key = f"{app_label}.{model_name}"
        
        entry = self._generators.get(key)
        return entry["generator"] if entry else None
    
    def get_entry(self, app_label: str, model_name: str = None) -> Optional[dict]:
        """Retorna entrada completa (generator + metadata)."""
        if model_name is None:
            key = app_label
        else:
            key = f"{app_label}.{model_name}"
        
        return self._generators.get(key)
    
    def list_all(self) -> Dict[str, dict]:
        """Retorna todos os geradores registrados."""
        return self._generators.copy()
    
    def list_by_app(self, app_label: str) -> Dict[str, dict]:
        """Retorna geradores de uma app específica."""
        return {
            k: v for k, v in self._generators.items()
            if v["app_label"] == app_label
        }
    
    def list_by_doc_type(self, doc_type: str) -> Dict[str, dict]:
        """Retorna geradores de um tipo de documento específico."""
        return {
            k: v for k, v in self._generators.items()
            if v["doc_type"] == doc_type
        }
    
    def exists(self, app_label: str, model_name: str = None) -> bool:
        """Verifica se um gerador está registrado."""
        if model_name is None:
            key = app_label
        else:
            key = f"{app_label}.{model_name}"
        
        return key in self._generators


# Instância global
PDF_GENERATORS_REGISTRY = PDFGeneratorRegistry()


def register_pdf_generator(
    app_label: str,
    model_name: str,
    generator: Callable,
    doc_type: str = None,
    description: str = None,
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
    from .result_pdf_generator import generate_results_pdf
    from .procedure_pdf_generator import generate_procedure_pdf
    from .request_pdf_generator import generate_request_pdf
    from .invoice_pdf_generator import generate_invoice_pdf
    from .receipt_pdf_generator import generate_receipt_pdf
    from .patient_history_pdf_generator import generate_patient_history_pdf
    from .pharmacy_reports_pdf_generator import (
        generate_pharmacy_product_consumption_pdf,
        generate_pharmacy_movements_pdf,
    )
    from .activity_reports_pdf_generator import generate_activity_report_pdf
    
    # Clínica
    PDF_GENERATORS_REGISTRY.register(
        app_label="clinical",
        model_name="labresult",
        generator=generate_results_pdf,
        doc_type=DocumentType.LABORATORY_RESULT,
        description="Resultado de análises laboratoriais",
    )
    
    PDF_GENERATORS_REGISTRY.register(
        app_label="clinical",
        model_name="labrequest",
        generator=generate_request_pdf,
        doc_type=DocumentType.REQUEST,
        description="Requisição de exames",
    )
    
    PDF_GENERATORS_REGISTRY.register(
        app_label="clinical",
        model_name="patient",
        generator=generate_patient_history_pdf,
        doc_type=DocumentType.PATIENT_HISTORY,
        description="Histórico do paciente",
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
    
    logger.info(f"✓ {len(PDF_GENERATORS_REGISTRY.list_all())} geradores padrão registrados")


# Registrar automaticamente ao importar
_register_builtin_generators()


__all__ = [
    "PDF_GENERATORS_REGISTRY",
    "PDFGeneratorRegistry",
    "register_pdf_generator",
]
