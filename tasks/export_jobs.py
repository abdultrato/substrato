"""Tasks Celery para geração assíncrona de exportações pesadas."""

from __future__ import annotations

from collections.abc import Callable
import logging
import time

from celery import shared_task

from observability.metrics import observe_async_task_duration
from services.reports.async_exports import (
    get_export_job_payload,
    get_export_job_state,
    mark_export_job_failed,
    mark_export_job_processing,
    mark_export_job_ready,
)

logger = logging.getLogger(__name__)


def _activity_report_pdf(payload: dict) -> tuple[bytes, str, str]:
    from tasks.generate_pdf.activity_reports_pdf_generator import generate_activity_report_pdf

    file_bytes, filename = generate_activity_report_pdf(payload, request=None)
    return file_bytes, filename, "application/pdf"


def _analytics_pdf(payload: dict) -> tuple[bytes, str, str]:
    from tasks.generate_pdf.analytics_pdf_generator import generate_analytics_pdf

    file_bytes, filename = generate_analytics_pdf(payload, request=None)
    return file_bytes, filename, "application/pdf"


def _billing_history_pdf(payload: dict) -> tuple[bytes, str, str]:
    from tasks.generate_pdf.billing_invoice_user_history_pdf_generator import generate_billing_user_history_pdf

    file_bytes, filename = generate_billing_user_history_pdf(payload, request=None)
    return file_bytes, filename, "application/pdf"


def _invoice_pdf(payload: dict) -> tuple[bytes, str, str]:
    from apps.billing.models.invoice import Invoice
    from tasks.generate_pdf.invoice_pdf_generator import generate_invoice_pdf

    invoice_id = int(payload.get("invoice_id") or 0)
    invoice = Invoice.objects.select_related("patient", "request").filter(pk=invoice_id, deleted=False).first()
    if not invoice:
        raise ValueError("Fatura não encontrada para exportação.")
    file_bytes, filename = generate_invoice_pdf(invoice, request=None)
    return file_bytes, filename, "application/pdf"


def _lab_results_pdf(payload: dict) -> tuple[bytes, str, str]:
    from apps.clinical.models.lab_request import LabRequest
    from tasks.generate_pdf.result_pdf_generator import generate_results_pdf

    request_id = int(payload.get("lab_request_id") or 0)
    request_record = LabRequest.objects.select_related("patient").filter(pk=request_id, deleted=False).first()
    if not request_record:
        raise ValueError("Requisição não encontrada para exportação de resultados.")
    apenas_validados = bool(payload.get("apenas_validados", True))
    file_bytes, filename = generate_results_pdf(request_record, apenas_validados=apenas_validados)
    return file_bytes, filename, "application/pdf"


def _patient_history_pdf(payload: dict) -> tuple[bytes, str, str]:
    from tasks.generate_pdf.patient_history_pdf_generator import generate_patient_history_pdf

    file_bytes, filename = generate_patient_history_pdf(payload, request=None)
    return file_bytes, filename, "application/pdf"


def _patient_invoice_history_pdf(payload: dict) -> tuple[bytes, str, str]:
    from tasks.generate_pdf.patient_invoice_history_pdf_generator import generate_patient_invoice_history_pdf

    file_bytes, filename = generate_patient_invoice_history_pdf(payload, request=None)
    return file_bytes, filename, "application/pdf"


def _patient_payment_history_pdf(payload: dict) -> tuple[bytes, str, str]:
    from tasks.generate_pdf.patient_payment_history_pdf_generator import generate_patient_payment_history_pdf

    file_bytes, filename = generate_patient_payment_history_pdf(payload, request=None)
    return file_bytes, filename, "application/pdf"


def _procedure_pdf(payload: dict) -> tuple[bytes, str, str]:
    from apps.nursing.models.procedure import Procedure
    from tasks.generate_pdf.procedure_pdf_generator import generate_procedure_pdf

    procedure_id = int(payload.get("procedure_id") or 0)
    procedure = Procedure.objects.select_related("patient").filter(pk=procedure_id, deleted=False).first()
    if not procedure:
        raise ValueError("Procedimento não encontrado para exportação.")
    file_bytes, filename = generate_procedure_pdf(procedure, request=None)
    return file_bytes, filename, "application/pdf"


def _receipt_pdf(payload: dict) -> tuple[bytes, str, str]:
    from apps.payments.models.receipt import Receipt
    from tasks.generate_pdf.receipt_pdf_generator import generate_receipt_pdf

    receipt_id = int(payload.get("receipt_id") or 0)
    receipt = Receipt.objects.select_related("invoice", "payment").filter(pk=receipt_id).first()
    if not receipt:
        raise ValueError("Recibo não encontrado para exportação.")
    file_bytes, filename = generate_receipt_pdf(receipt, request=None)
    return file_bytes, filename, "application/pdf"


def _pharmacy_stock_pdf(payload: dict) -> tuple[bytes, str, str]:
    from tasks.generate_pdf.pharmacy_reports_pdf_generator import generate_pharmacy_stock_pdf

    file_bytes, filename = generate_pharmacy_stock_pdf(payload, request=None)
    return file_bytes, filename, "application/pdf"


def _pharmacy_movements_pdf(payload: dict) -> tuple[bytes, str, str]:
    from tasks.generate_pdf.pharmacy_reports_pdf_generator import generate_pharmacy_movements_pdf

    file_bytes, filename = generate_pharmacy_movements_pdf(payload, request=None)
    return file_bytes, filename, "application/pdf"


def _pharmacy_product_consumption_pdf(payload: dict) -> tuple[bytes, str, str]:
    from tasks.generate_pdf.pharmacy_reports_pdf_generator import generate_pharmacy_product_consumption_pdf

    file_bytes, filename = generate_pharmacy_product_consumption_pdf(payload, request=None)
    return file_bytes, filename, "application/pdf"


def _pharmacy_top_requested_products_pdf(payload: dict) -> tuple[bytes, str, str]:
    from tasks.generate_pdf.pharmacy_reports_pdf_generator import generate_pharmacy_top_requested_products_pdf

    file_bytes, filename = generate_pharmacy_top_requested_products_pdf(payload, request=None)
    return file_bytes, filename, "application/pdf"


def _pharmacy_least_requested_products_pdf(payload: dict) -> tuple[bytes, str, str]:
    from tasks.generate_pdf.pharmacy_reports_pdf_generator import generate_pharmacy_least_requested_products_pdf

    file_bytes, filename = generate_pharmacy_least_requested_products_pdf(payload, request=None)
    return file_bytes, filename, "application/pdf"


def _pharmacy_product_sector_demand_pdf(payload: dict) -> tuple[bytes, str, str]:
    from tasks.generate_pdf.pharmacy_reports_pdf_generator import generate_pharmacy_product_sector_demand_pdf

    file_bytes, filename = generate_pharmacy_product_sector_demand_pdf(payload, request=None)
    return file_bytes, filename, "application/pdf"


def _pharmacy_sector_movements_pdf(payload: dict) -> tuple[bytes, str, str]:
    from tasks.generate_pdf.pharmacy_reports_pdf_generator import generate_pharmacy_sector_movements_pdf

    file_bytes, filename = generate_pharmacy_sector_movements_pdf(payload, request=None)
    return file_bytes, filename, "application/pdf"


EXPORT_RUNNERS: dict[str, Callable[[dict], tuple[bytes, str, str]]] = {
    "activity_report_pdf": _activity_report_pdf,
    "analytics_pdf": _analytics_pdf,
    "billing_history_pdf": _billing_history_pdf,
    "invoice_pdf": _invoice_pdf,
    "lab_results_pdf": _lab_results_pdf,
    "patient_history_pdf": _patient_history_pdf,
    "patient_invoice_history_pdf": _patient_invoice_history_pdf,
    "patient_payment_history_pdf": _patient_payment_history_pdf,
    "procedure_pdf": _procedure_pdf,
    "receipt_pdf": _receipt_pdf,
    "pharmacy_stock_pdf": _pharmacy_stock_pdf,
    "pharmacy_movements_pdf": _pharmacy_movements_pdf,
    "pharmacy_product_consumption_pdf": _pharmacy_product_consumption_pdf,
    "pharmacy_top_requested_products_pdf": _pharmacy_top_requested_products_pdf,
    "pharmacy_least_requested_products_pdf": _pharmacy_least_requested_products_pdf,
    "pharmacy_product_sector_demand_pdf": _pharmacy_product_sector_demand_pdf,
    "pharmacy_sector_movements_pdf": _pharmacy_sector_movements_pdf,
}


@shared_task(bind=True, max_retries=0)
def run_export_job(self, job_id: str):
    state = get_export_job_state(job_id)
    if not state:
        return

    export_key = str(state.get("export_key") or "").strip()
    tenant_id = state.get("tenant_id") or "unknown"
    metric_task_name = f"export:{export_key or 'unknown'}"
    started = time.perf_counter()

    try:
        mark_export_job_processing(job_id)
        payload = get_export_job_payload(job_id)
        runner = EXPORT_RUNNERS.get(export_key)
        if not runner:
            raise ValueError(f"Tipo de exportação não suportado: {export_key}")

        file_bytes, filename, content_type = runner(payload)
        mark_export_job_ready(
            job_id,
            file_bytes=file_bytes,
            filename=filename,
            content_type=content_type,
        )
        observe_async_task_duration(
            metric_task_name,
            time.perf_counter() - started,
            status="success",
            tenant_id=tenant_id,
        )
    except Exception as exc:
        mark_export_job_failed(job_id, str(exc))
        observe_async_task_duration(
            metric_task_name,
            time.perf_counter() - started,
            status="failed",
            tenant_id=tenant_id,
        )
        logger.exception(
            "Falha na exportação assíncrona",
            extra={"job_id": job_id, "export_key": export_key},
        )
