"""Serviços de ingestão de dados vindos de equipamentos clínicos."""

from __future__ import annotations

import base64
import binascii
from contextlib import suppress
from decimal import Decimal, InvalidOperation
import hashlib
import json
from typing import Any

from django.core.files.base import ContentFile
from django.db import transaction
from django.utils import timezone

from apps.clinical.models.medical_result_file import MedicalResultFile
from apps.clinical.models.result import Result
from apps.clinical.models.result_item import ResultItem
from apps.equipment_integrations.models import (
    IntegrationAnalyteMapping,
    IntegrationDocument,
    IntegrationEquipment,
    IntegrationMessage,
    IntegrationOrder,
    IntegrationOrderItem,
)
from core.constants.medical_exam.medical_exam_result_type import MedicalExamResultType


class EquipmentIngestionError(Exception):
    """Erro esperado durante ingestão de mensagem de equipamento."""

    def __init__(self, detail: str, status_code: int = 400):
        super().__init__(detail)
        self.detail = detail
        self.status_code = status_code


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data or b"").hexdigest()


def stable_json_bytes(payload: dict[str, Any]) -> bytes:
    return json.dumps(payload or {}, ensure_ascii=False, sort_keys=True, default=str).encode("utf-8")


def normalize_tcp_payload(raw_text: str, equipment: IntegrationEquipment | None = None) -> dict[str, Any]:
    """
    Converte mensagens TCP comuns em payload normalizado.

    Suporta JSON por linha, HL7 v2/MLLP e ASTM básico. Mensagens não
    reconhecidas continuam auditáveis, mas não são aplicadas a um exame.
    """

    text = (raw_text or "").strip("\x00\r\n ")
    if text.startswith("\x0b"):
        text = text[1:]
    if text.endswith("\x1c\r"):
        text = text[:-2]
    elif text.endswith("\x1c"):
        text = text[:-1]
    text = text.strip()

    if not text:
        return {}

    with suppress(json.JSONDecodeError):
        parsed = json.loads(text)
        if isinstance(parsed, dict):
            return parsed

    if text.startswith("MSH"):
        return _parse_hl7_message(text)

    if "\nR|" in text or "\rR|" in text or text.startswith("H|"):
        return _parse_astm_message(text)

    protocol = getattr(equipment, "protocol", "") if equipment is not None else ""
    return {
        "message_id": sha256_bytes(text.encode("utf-8"))[:24],
        "protocol": protocol,
        "payload_raw": text,
        "results": [],
    }


def ingest_equipment_payload(
    *,
    equipment: IntegrationEquipment,
    payload: dict[str, Any],
    raw_body: bytes | None = None,
    content_type: str = "application/json",
) -> dict[str, Any]:
    """Aplica uma mensagem de equipamento no destino clínico correto."""

    if not equipment.active:
        raise EquipmentIngestionError("Equipamento de integração inativo.", status_code=403)
    if not equipment.auto_consume_results:
        raise EquipmentIngestionError("Consumo automático desativado para este equipamento.", status_code=409)

    payload = dict(payload or {})
    raw = raw_body if raw_body is not None else stable_json_bytes(payload)
    message_id = str(payload.get("message_id") or payload.get("message_control_id") or "").strip()
    accession = _payload_accession(payload)
    raw_hash = sha256_bytes(raw)

    if message_id:
        duplicate = IntegrationMessage.objects.filter(
            equipment=equipment,
            message_id=message_id,
            sha256=raw_hash,
            deleted=False,
        ).first()
        if duplicate is not None:
            return {
                "message": duplicate.custom_id,
                "order": accession,
                "order_status": duplicate.status,
                "target": "duplicate",
                "applied": [],
                "errors": [],
                "detail": "Mensagem já processada (idempotência).",
            }

    target = _resolve_target(equipment, payload, accession)

    with transaction.atomic():
        if target["kind"] == "clinical_order":
            response = _ingest_clinical_order(
                equipment=equipment,
                order=target["object"],
                payload=payload,
                raw_body=raw,
                raw_hash=raw_hash,
                message_id=message_id,
                content_type=content_type,
            )
        elif target["kind"] == "radiology_study":
            response = _ingest_radiology_study(
                equipment=equipment,
                study=target["object"],
                payload=payload,
                raw_body=raw,
                raw_hash=raw_hash,
                message_id=message_id,
                content_type=content_type,
            )
        elif target["kind"] == "specialty_order":
            response = _ingest_specialty_order(
                equipment=equipment,
                order=target["object"],
                payload=payload,
                raw_body=raw,
                raw_hash=raw_hash,
                message_id=message_id,
                content_type=content_type,
            )
        else:
            raise EquipmentIngestionError("Destino de integração não suportado.", status_code=400)

        equipment.last_seen_at = timezone.now()
        equipment.save(update_fields=["last_seen_at", "updated_at"])
        return response


def _payload_accession(payload: dict[str, Any]) -> str:
    candidates = [
        payload.get("accession"),
        payload.get("accession_number"),
        payload.get("order_number"),
        payload.get("external_order_id"),
        payload.get("order"),
        payload.get("pedido"),
    ]
    imaging = payload.get("imaging") if isinstance(payload.get("imaging"), dict) else {}
    candidates.extend([imaging.get("accession_number"), imaging.get("study_instance_uid")])
    for value in candidates:
        clean = str(value or "").strip()
        if clean:
            return clean
    return ""


def _resolve_target(equipment: IntegrationEquipment, payload: dict[str, Any], accession: str) -> dict[str, Any]:
    domain = str(payload.get("domain") or payload.get("target_type") or payload.get("target") or "").strip().lower()
    tenant = equipment.tenant

    if accession:
        if domain in {"", "laboratory", "lab", "medical", "medical_exam", "clinical", "clinical_order"}:
            clinical_order = IntegrationOrder.objects.filter(
                equipment=equipment,
                custom_id=accession,
                deleted=False,
            ).select_related("request__patient").first()
            if clinical_order is not None:
                return {"kind": "clinical_order", "object": clinical_order}

        if domain in {"", "radiology", "imaging", "pacs", "dicom"}:
            with suppress(Exception):
                from apps.radiology.models import ImagingStudy

                imaging = payload.get("imaging") if isinstance(payload.get("imaging"), dict) else {}
                study_uid = str(payload.get("study_instance_uid") or imaging.get("study_instance_uid") or "").strip()
                qs = ImagingStudy.objects.filter(tenant=tenant, deleted=False)
                study = (
                    qs.filter(accession_number=accession).first()
                    or qs.filter(custom_id=accession).first()
                    or (qs.filter(study_instance_uid=study_uid).first() if study_uid else None)
                )
                if study is not None:
                    return {"kind": "radiology_study", "object": study}

        if domain in {"", "specialty", "specialty_diagnostics", "diagnostics", "cardiology", "neurology", "ophthalmology", "ecg", "eeg", "oct"}:
            with suppress(Exception):
                from apps.specialty_diagnostics.models import SpecialtyDiagnosticOrder

                qs = SpecialtyDiagnosticOrder.objects.filter(tenant=tenant, deleted=False)
                order = (
                    qs.filter(order_number=accession).first()
                    or qs.filter(external_order_id=accession).first()
                    or qs.filter(custom_id=accession).first()
                )
                if order is not None:
                    return {"kind": "specialty_order", "object": order}

    raise EquipmentIngestionError("Ordem/exame não encontrado para este equipamento.", status_code=404)


def _create_message(
    *,
    equipment: IntegrationEquipment,
    order: IntegrationOrder | None,
    payload: dict[str, Any],
    raw_body: bytes,
    raw_hash: str,
    message_id: str,
    content_type: str,
) -> IntegrationMessage:
    msg = IntegrationMessage.create_from_payload(
        equipment=equipment,
        order=order,
        direction=IntegrationMessage.Direction.INBOUND,
        protocol=payload.get("protocol") or equipment.protocol,
        message_id=message_id,
        content_type=content_type,
        raw_body=raw_body,
        payload_json=payload,
    )
    if msg.sha256 != raw_hash:
        msg.sha256 = raw_hash
        msg.save(update_fields=["sha256", "updated_at"])
    return msg


def _finish_message(msg: IntegrationMessage, errors: list[str]) -> None:
    msg.status = IntegrationMessage.Status.ERROR if errors else IntegrationMessage.Status.PROCESSED
    msg.error = "\n".join(errors)[:8000] if errors else ""
    msg.processed_at = timezone.now()
    msg.save(update_fields=["status", "error", "processed_at", "updated_at"])


def _ingest_clinical_order(
    *,
    equipment: IntegrationEquipment,
    order: IntegrationOrder,
    payload: dict[str, Any],
    raw_body: bytes,
    raw_hash: str,
    message_id: str,
    content_type: str,
) -> dict[str, Any]:
    msg = _create_message(
        equipment=equipment,
        order=order,
        payload=payload,
        raw_body=raw_body,
        raw_hash=raw_hash,
        message_id=message_id,
        content_type=content_type,
    )

    results = _as_list(payload.get("results") or payload.get("measurements"))
    documents = _as_list(payload.get("documents") or payload.get("files"))
    applied: list[dict[str, Any]] = []
    errors: list[str] = []

    request = order.request
    result, _ = Result.objects.get_or_create(request=request, defaults={"tenant": request.tenant})

    for order_item in order.items.select_related("request_item").all():
        with suppress(Exception):
            order_item.request_item._create_results()

    for row in results:
        _apply_laboratory_result(equipment, result, row, applied, errors)

    _persist_integration_documents(
        message=msg,
        documents=documents,
        order=order,
        result=result,
        applied=applied,
        errors=errors,
    )

    if errors:
        order.status = IntegrationOrder.Status.ERROR
    else:
        order.status = _clinical_order_status(order, result, bool(applied or documents))
        if order.status == IntegrationOrder.Status.DONE:
            order.items.exclude(status=IntegrationOrderItem.Status.CANCELED).update(status=IntegrationOrderItem.Status.DONE)
    order.save(update_fields=["status", "updated_at"])
    _finish_message(msg, errors)

    return {
        "message": msg.custom_id,
        "order": order.custom_id,
        "order_status": order.status,
        "target": "clinical_order",
        "applied": applied,
        "errors": errors,
    }


def _apply_laboratory_result(
    equipment: IntegrationEquipment,
    result: Result,
    row: Any,
    applied: list[dict[str, Any]],
    errors: list[str],
) -> None:
    if not isinstance(row, dict):
        errors.append("Resultado inválido: cada item deve ser um objeto.")
        return

    code = str(row.get("code") or row.get("codigo") or row.get("analyte") or "").strip()
    value_raw = row.get("value", row.get("valor"))
    if not code:
        errors.append("Resultado sem 'code'.")
        return

    mapping = (
        IntegrationAnalyteMapping.objects.filter(
            equipment=equipment,
            code=code,
            active=True,
            deleted=False,
        )
        .select_related("exam_field")
        .first()
    )
    if mapping is None:
        errors.append(f"Sem mapeamento para code '{code}'.")
        return

    item = ResultItem.objects.filter(result=result, exam_field=mapping.exam_field, deleted=False).first()
    if item is None:
        errors.append(f"Campo '{mapping.exam_field.name}' não pertence à requisição desta ordem.")
        return

    try:
        if value_raw is None or value_raw == "":
            raise InvalidOperation
        value = Decimal(str(value_raw))
    except (InvalidOperation, ValueError, TypeError):
        errors.append(f"Valor inválido para '{code}': {value_raw!r}.")
        return

    item.result_value = value
    item.save(update_fields=["result_value", "updated_at"])
    applied.append(
        {
            "code": code,
            "exam_field_id": mapping.exam_field.id,
            "exam_field": mapping.exam_field.name,
            "value": str(value),
        }
    )


def _clinical_order_status(order: IntegrationOrder, result: Result, has_payload: bool) -> str:
    complete = True
    has_lab_items = False
    for oi in order.items.select_related("request_item__exam").all():
        ri = oi.request_item
        if not ri.exam_id:
            continue
        has_lab_items = True
        fields = list(getattr(ri.exam, "campos", []).all())
        for field in fields:
            if not ResultItem.objects.filter(
                result=result,
                exam_field=field,
                result_value__isnull=False,
                deleted=False,
            ).exists():
                complete = False
                break
        if not complete:
            break

    if has_lab_items:
        return IntegrationOrder.Status.DONE if complete else IntegrationOrder.Status.IN_PROGRESS
    return IntegrationOrder.Status.DONE if has_payload else IntegrationOrder.Status.IN_PROGRESS


def _persist_integration_documents(
    *,
    message: IntegrationMessage,
    documents: list[Any],
    order: IntegrationOrder | None = None,
    result: Result | None = None,
    applied: list[dict[str, Any]],
    errors: list[str],
) -> list[IntegrationDocument]:
    saved: list[IntegrationDocument] = []
    for doc_payload in documents:
        if not isinstance(doc_payload, dict):
            errors.append("Documento inválido: cada item deve ser um objeto.")
            continue

        decoded = _decode_document(doc_payload, errors)
        if decoded is None:
            continue

        filename, content_type, raw = decoded
        order_item = None
        request_item_id = doc_payload.get("request_item_id") or doc_payload.get("item_id")
        if order is not None and request_item_id:
            order_item = IntegrationOrderItem.objects.filter(
                order=order,
                request_item_id=request_item_id,
                deleted=False,
            ).select_related("request_item__medical_exam").first()

        integration_doc = IntegrationDocument(
            tenant=message.tenant,
            message=message,
            order_item=order_item,
            filename=filename,
            content_type=content_type,
            sha256=sha256_bytes(raw),
        )
        integration_doc.file.save(filename, ContentFile(raw), save=True)
        saved.append(integration_doc)
        applied.append({"code": "document", "filename": filename, "content_type": content_type})

        if result is not None and order_item is not None and order_item.request_item.medical_exam_id:
            _create_medical_result_file(result, order_item, filename, content_type, raw, doc_payload)

    return saved


def _decode_document(doc_payload: dict[str, Any], errors: list[str]) -> tuple[str, str, bytes] | None:
    filename = str(doc_payload.get("filename") or doc_payload.get("name") or "documento.bin").strip() or "documento.bin"
    content_type = str(doc_payload.get("content_type") or doc_payload.get("mime_type") or "application/octet-stream").strip()
    b64 = doc_payload.get("base64") or doc_payload.get("content_base64") or ""
    if not b64:
        errors.append(f"Documento '{filename}' sem base64.")
        return None
    try:
        raw = base64.b64decode(b64, validate=True)
    except (binascii.Error, ValueError):
        errors.append(f"Documento '{filename}' com base64 inválido.")
        return None
    return filename, content_type, raw


def _create_medical_result_file(
    result: Result,
    order_item: IntegrationOrderItem,
    filename: str,
    content_type: str,
    raw: bytes,
    doc_payload: dict[str, Any],
) -> None:
    request_item = order_item.request_item
    medical_exam = request_item.medical_exam
    if medical_exam is None:
        return

    result_type = _medical_result_type(filename, content_type, doc_payload.get("file_type") or doc_payload.get("type"))
    obj = MedicalResultFile(
        tenant=result.tenant,
        result=result,
        request_item=request_item,
        medical_exam=medical_exam,
        type=result_type,
        description=str(doc_payload.get("description") or doc_payload.get("label") or filename)[:255],
    )
    obj.file.save(filename, ContentFile(raw), save=True)


def _medical_result_type(filename: str, content_type: str, value: Any = "") -> str:
    raw = str(value or "").upper()
    if raw in MedicalExamResultType.values:
        return raw
    clean_name = filename.lower()
    clean_type = content_type.lower()
    if raw == "REPORT_PDF" or clean_type == "application/pdf" or clean_name.endswith(".pdf"):
        return MedicalExamResultType.RELATORIO_PDF
    if raw == "DICOM" or "dicom" in clean_type or clean_name.endswith((".dcm", ".dicom")):
        return MedicalExamResultType.DICOM
    if raw == "VIDEO" or clean_type.startswith("video/"):
        return MedicalExamResultType.VIDEO
    return MedicalExamResultType.IMAGEM


def _ingest_radiology_study(
    *,
    equipment: IntegrationEquipment,
    study,
    payload: dict[str, Any],
    raw_body: bytes,
    raw_hash: str,
    message_id: str,
    content_type: str,
) -> dict[str, Any]:
    from apps.radiology.models import ImagingFile, ImagingReport, ImagingSeries, PacsIntegrationEvent

    msg = _create_message(
        equipment=equipment,
        order=None,
        payload=payload,
        raw_body=raw_body,
        raw_hash=raw_hash,
        message_id=message_id,
        content_type=content_type,
    )

    imaging = payload.get("imaging") if isinstance(payload.get("imaging"), dict) else {}
    applied: list[dict[str, Any]] = []
    errors: list[str] = []

    study_uid = str(payload.get("study_instance_uid") or imaging.get("study_instance_uid") or "").strip()
    storage_uri = str(payload.get("storage_uri") or imaging.get("storage_uri") or "").strip()
    image_count = _int_or_none(payload.get("image_count", imaging.get("image_count")))

    update_fields = []
    if study_uid and not study.study_instance_uid:
        study.study_instance_uid = study_uid
        update_fields.append("study_instance_uid")
    if storage_uri and study.storage_uri != storage_uri:
        study.storage_uri = storage_uri
        update_fields.append("storage_uri")
    if image_count is not None and study.image_count != image_count:
        study.image_count = image_count
        update_fields.append("image_count")
    if image_count or storage_uri or study_uid:
        if not study.images_available:
            study.images_available = True
            update_fields.append("images_available")
        if not study.acquired_at:
            study.acquired_at = timezone.now()
            update_fields.append("acquired_at")
        if study.status in {study.Status.REQUESTED, study.Status.SCHEDULED, study.Status.IN_PROGRESS}:
            study.status = study.Status.ACQUIRED
            update_fields.append("status")
    if update_fields:
        study.save(update_fields=list(dict.fromkeys(update_fields)))
        applied.append({"code": "study", "value": study.accession_number or study.custom_id})

    series_by_uid: dict[str, Any] = {}
    for row in _as_list(payload.get("series") or imaging.get("series")):
        if not isinstance(row, dict):
            errors.append("Série inválida: cada item deve ser um objeto.")
            continue
        series = _get_or_create_imaging_series(ImagingSeries, study, row)
        if series.series_instance_uid:
            series_by_uid[series.series_instance_uid] = series
        applied.append({"code": "series", "value": series.series_instance_uid or series.series_number})

    for doc_payload in _as_list(payload.get("documents") or payload.get("files") or imaging.get("files")):
        if not isinstance(doc_payload, dict):
            errors.append("Ficheiro de imagem inválido: cada item deve ser um objeto.")
            continue
        _create_imaging_file(ImagingFile, ImagingSeries, study, series_by_uid, doc_payload, applied, errors)

    report_payload = payload.get("report") if isinstance(payload.get("report"), dict) else {}
    if report_payload:
        report = ImagingReport.objects.create(
            tenant=study.tenant,
            study=study,
            status=report_payload.get("status") or ImagingReport.Status.PRELIMINARY,
            technique=str(report_payload.get("technique") or ""),
            findings=str(report_payload.get("findings") or report_payload.get("text") or ""),
            impression=str(report_payload.get("impression") or ""),
            recommendations=str(report_payload.get("recommendations") or ""),
            critical_result=bool(report_payload.get("critical_result") or report_payload.get("critical")),
        )
        applied.append({"code": "report", "value": report.custom_id})

    pacs_equipment = getattr(study, "equipment", None)
    event_status = PacsIntegrationEvent.Status.FAILED if errors else PacsIntegrationEvent.Status.ACKNOWLEDGED
    event_type = payload.get("event_type") or (PacsIntegrationEvent.EventType.STORE if applied else PacsIntegrationEvent.EventType.STUDY_SYNC)
    if event_type not in PacsIntegrationEvent.EventType.values:
        event_type = PacsIntegrationEvent.EventType.STUDY_SYNC
    PacsIntegrationEvent.objects.create(
        tenant=study.tenant,
        study=study,
        equipment=pacs_equipment,
        event_type=event_type,
        direction=PacsIntegrationEvent.Direction.INBOUND,
        status=event_status,
        external_system=equipment.name or equipment.custom_id or "Equipamento",
        message_control_id=message_id,
        payload=payload,
        response={"integration_message": msg.custom_id, "applied": len(applied), "errors": errors},
        error_message="\n".join(errors)[:8000],
    )

    _persist_integration_documents(message=msg, documents=_as_list(payload.get("documents")), applied=applied, errors=errors)
    _finish_message(msg, errors)
    study.refresh_from_db()

    return {
        "message": msg.custom_id,
        "order": study.accession_number or study.custom_id,
        "order_status": study.status,
        "target": "radiology_study",
        "applied": applied,
        "errors": errors,
    }


def _get_or_create_imaging_series(model, study, row: dict[str, Any]):
    uid = str(row.get("series_instance_uid") or "").strip()
    number = _int_or_none(row.get("series_number")) or 1
    defaults = {
        "tenant": study.tenant,
        "study": study,
        "series_number": number,
        "modality": row.get("modality") or study.modality,
        "body_region": row.get("body_region") or study.body_region,
        "description": str(row.get("description") or "")[:255],
        "image_count": _int_or_none(row.get("image_count")) or 0,
        "storage_uri": str(row.get("storage_uri") or ""),
        "acquisition_started_at": _parse_datetime(row.get("acquisition_started_at")),
        "acquisition_completed_at": _parse_datetime(row.get("acquisition_completed_at")),
    }
    if uid:
        series, created = model.objects.get_or_create(
            tenant=study.tenant,
            series_instance_uid=uid,
            defaults=defaults,
        )
    else:
        series, created = model.objects.get_or_create(
            study=study,
            series_number=number,
            defaults=defaults,
        )
    if not created:
        changed = []
        for field in ["description", "image_count", "storage_uri"]:
            value = defaults[field]
            if value and getattr(series, field) != value:
                setattr(series, field, value)
                changed.append(field)
        if changed:
            series.save(update_fields=changed)
    return series


def _create_imaging_file(model, series_model, study, series_by_uid: dict[str, Any], row: dict[str, Any], applied: list[dict[str, Any]], errors: list[str]) -> None:
    decoded = None
    if row.get("base64") or row.get("content_base64"):
        decoded = _decode_document(row, errors)
        if decoded is None:
            return

    series = None
    series_uid = str(row.get("series_instance_uid") or "").strip()
    if series_uid:
        series = series_by_uid.get(series_uid)
        if series is None:
            series = _get_or_create_imaging_series(series_model, study, {"series_instance_uid": series_uid})
            series_by_uid[series_uid] = series

    sop_uid = str(row.get("sop_instance_uid") or "").strip()
    file_type = _imaging_file_type(row.get("file_type") or row.get("type"), row.get("filename") or "", row.get("content_type") or "")
    defaults = {
        "tenant": study.tenant,
        "study": study,
        "series": series,
        "file_type": file_type,
        "pacs_object_uri": str(row.get("pacs_object_uri") or row.get("uri") or ""),
        "content_type": str(row.get("content_type") or ""),
        "file_size": _int_or_none(row.get("file_size")) or 0,
        "image_number": _int_or_none(row.get("image_number")) or 0,
        "checksum": str(row.get("checksum") or ""),
        "notes": str(row.get("notes") or ""),
    }
    if sop_uid:
        image_file, created = model.objects.get_or_create(
            tenant=study.tenant,
            sop_instance_uid=sop_uid,
            defaults={**defaults, "sop_instance_uid": sop_uid},
        )
    else:
        image_file = model.objects.create(**defaults)
        created = True
    if decoded is not None and created:
        filename, _content_type, raw = decoded
        image_file.file.save(filename, ContentFile(raw), save=True)
    applied.append({"code": "image_file", "value": sop_uid or defaults["pacs_object_uri"] or image_file.custom_id})


def _imaging_file_type(value: Any, filename: str, content_type: str) -> str:
    from apps.radiology.models import ImagingFile

    raw = str(value or "").upper()
    if raw in ImagingFile.FileType.values:
        return raw
    clean_name = filename.lower()
    clean_type = content_type.lower()
    if "dicom" in clean_type or clean_name.endswith((".dcm", ".dicom")):
        return ImagingFile.FileType.DICOM
    if clean_type == "application/pdf" or clean_name.endswith(".pdf"):
        return ImagingFile.FileType.REPORT_PDF
    if clean_type.startswith("video/"):
        return ImagingFile.FileType.VIDEO
    if clean_type.startswith("image/"):
        return ImagingFile.FileType.IMAGE
    return ImagingFile.FileType.OTHER


def _ingest_specialty_order(
    *,
    equipment: IntegrationEquipment,
    order,
    payload: dict[str, Any],
    raw_body: bytes,
    raw_hash: str,
    message_id: str,
    content_type: str,
) -> dict[str, Any]:
    from apps.specialty_diagnostics.models import (
        SpecialtyDiagnosticIntegrationEvent,
        SpecialtyDiagnosticMeasurement,
        SpecialtyDiagnosticReport,
    )

    msg = _create_message(
        equipment=equipment,
        order=None,
        payload=payload,
        raw_body=raw_body,
        raw_hash=raw_hash,
        message_id=message_id,
        content_type=content_type,
    )

    applied: list[dict[str, Any]] = []
    errors: list[str] = []
    measurements = _as_list(payload.get("measurements") or payload.get("results"))

    for row in measurements:
        if not isinstance(row, dict):
            errors.append("Medição inválida: cada item deve ser um objeto.")
            continue
        measurement = _create_specialty_measurement(SpecialtyDiagnosticMeasurement, order, row, errors)
        if measurement is not None:
            applied.append({"code": measurement.code or measurement.name, "value": _measurement_value(measurement)})

    report_payload = payload.get("report") if isinstance(payload.get("report"), dict) else {}
    if report_payload:
        report = SpecialtyDiagnosticReport.objects.create(
            tenant=order.tenant,
            order=order,
            status=report_payload.get("status") or SpecialtyDiagnosticReport.Status.PRELIMINARY,
            technique=str(report_payload.get("technique") or ""),
            findings=str(report_payload.get("findings") or report_payload.get("text") or ""),
            impression=str(report_payload.get("impression") or ""),
            recommendations=str(report_payload.get("recommendations") or ""),
            critical_result=bool(report_payload.get("critical_result") or report_payload.get("critical")),
        )
        applied.append({"code": "report", "value": report.custom_id})

    _persist_integration_documents(message=msg, documents=_as_list(payload.get("documents") or payload.get("files")), applied=applied, errors=errors)

    event_status = SpecialtyDiagnosticIntegrationEvent.Status.FAILED if errors else SpecialtyDiagnosticIntegrationEvent.Status.ACKNOWLEDGED
    event_type = payload.get("event_type") or SpecialtyDiagnosticIntegrationEvent.EventType.DEVICE_IMPORT
    if event_type not in SpecialtyDiagnosticIntegrationEvent.EventType.values:
        event_type = SpecialtyDiagnosticIntegrationEvent.EventType.DEVICE_IMPORT
    SpecialtyDiagnosticIntegrationEvent.objects.create(
        tenant=order.tenant,
        order=order,
        equipment=getattr(order, "equipment", None),
        event_type=event_type,
        direction=SpecialtyDiagnosticIntegrationEvent.Direction.INBOUND,
        status=event_status,
        external_system=equipment.name or equipment.custom_id or "Equipamento",
        message_control_id=message_id,
        payload=payload,
        response={"integration_message": msg.custom_id, "applied": len(applied), "errors": errors},
        error_message="\n".join(errors)[:8000],
    )

    if applied and order.status in {order.Status.REQUESTED, order.Status.SCHEDULED, order.Status.IN_PROGRESS}:
        order.performed_at = order.performed_at or timezone.now()
        order.status = order.Status.PERFORMED
        order.save(update_fields=["performed_at", "status", "updated_at"])

    _finish_message(msg, errors)
    order.refresh_from_db()
    return {
        "message": msg.custom_id,
        "order": order.order_number or order.external_order_id or order.custom_id,
        "order_status": order.status,
        "target": "specialty_order",
        "applied": applied,
        "errors": errors,
    }


def _create_specialty_measurement(model, order, row: dict[str, Any], errors: list[str]):
    code = str(row.get("code") or row.get("codigo") or row.get("measurement") or "").strip()
    value = row.get("value", row.get("valor"))
    value_type = str(row.get("value_type") or "").strip().upper()

    if not code:
        errors.append("Medição sem 'code'.")
        return None
    if value is None or value == "":
        errors.append(f"Medição '{code}' sem valor.")
        return None

    if value_type not in model.ValueType.values:
        value_type = _infer_specialty_value_type(value, row)

    data = {
        "tenant": order.tenant,
        "order": order,
        "code": code,
        "name": str(row.get("name") or row.get("label") or code)[:120],
        "value_type": value_type,
        "unit": str(row.get("unit") or row.get("unidade") or "")[:40],
        "reference_range": str(row.get("reference_range") or row.get("reference") or "")[:120],
        "interpretation": str(row.get("interpretation") or ""),
        "abnormal": bool(row.get("abnormal") or row.get("altered")),
        "critical": bool(row.get("critical") or row.get("critical_result")),
        "measured_at": _parse_datetime(row.get("measured_at")) or timezone.now(),
        "notes": str(row.get("notes") or ""),
    }

    if value_type == model.ValueType.NUMERIC:
        try:
            data["numeric_value"] = Decimal(str(value))
        except (InvalidOperation, ValueError, TypeError):
            errors.append(f"Valor numérico inválido para '{code}': {value!r}.")
            return None
        data["text_value"] = ""
    elif value_type == model.ValueType.BOOLEAN:
        data["text_value"] = "Sim" if bool(value) else "Não"
    else:
        data["text_value"] = str(value)

    return model.objects.create(**data)


def _infer_specialty_value_type(value: Any, row: dict[str, Any]) -> str:
    from apps.specialty_diagnostics.models import SpecialtyDiagnosticMeasurement

    if isinstance(value, bool):
        return SpecialtyDiagnosticMeasurement.ValueType.BOOLEAN
    raw_kind = str(row.get("kind") or row.get("type") or "").upper()
    if raw_kind in SpecialtyDiagnosticMeasurement.ValueType.values:
        return raw_kind
    with suppress(Exception):
        Decimal(str(value))
        return SpecialtyDiagnosticMeasurement.ValueType.NUMERIC
    return SpecialtyDiagnosticMeasurement.ValueType.TEXT


def _measurement_value(measurement) -> str:
    if measurement.value_type == measurement.ValueType.NUMERIC:
        return str(measurement.numeric_value)
    return measurement.text_value


def _as_list(value: Any) -> list[Any]:
    if value is None:
        return []
    if isinstance(value, list):
        return value
    return [value]


def _int_or_none(value: Any) -> int | None:
    if value in (None, ""):
        return None
    with suppress(Exception):
        return int(value)
    return None


def _parse_datetime(value: Any):
    if not value:
        return None
    if hasattr(value, "tzinfo"):
        return value
    with suppress(Exception):
        from django.utils.dateparse import parse_datetime

        parsed = parse_datetime(str(value))
        if parsed is not None:
            return parsed
    return None


def _parse_hl7_message(text: str) -> dict[str, Any]:
    segments = [line for line in text.replace("\n", "\r").split("\r") if line]
    message_id = ""
    accession = ""
    results: list[dict[str, Any]] = []

    for segment in segments:
        sep = segment[3] if len(segment) > 3 else "|"
        fields = segment.split(sep)
        if fields[0] == "MSH":
            message_id = _safe_field(fields, 9)
        elif fields[0] == "OBR":
            accession = _safe_field(fields, 3) or _safe_field(fields, 2)
        elif fields[0] == "OBX":
            code = (_safe_field(fields, 3).split("^")[-1] or _safe_field(fields, 3)).strip()
            value = _safe_field(fields, 5)
            if code:
                results.append(
                    {
                        "code": code,
                        "value": value,
                        "unit": _safe_field(fields, 6),
                        "reference_range": _safe_field(fields, 7),
                        "abnormal": bool(_safe_field(fields, 8)),
                    }
                )

    return {
        "message_id": message_id or sha256_bytes(text.encode("utf-8"))[:24],
        "accession": accession,
        "results": results,
        "protocol": IntegrationEquipment.Protocolo.HL7_MLLP,
    }


def _parse_astm_message(text: str) -> dict[str, Any]:
    rows = [line for line in text.replace("\r", "\n").split("\n") if line]
    accession = ""
    message_id = ""
    results: list[dict[str, Any]] = []

    for row in rows:
        fields = row.split("|")
        if not fields:
            continue
        if fields[0].endswith("H"):
            message_id = _safe_field(fields, 4) or _safe_field(fields, 2)
        elif fields[0].endswith("O") or fields[0] == "O":
            accession = _safe_field(fields, 2) or _safe_field(fields, 3)
        elif fields[0].endswith("R") or fields[0] == "R":
            code = (_safe_field(fields, 2).split("^")[-1] or _safe_field(fields, 2)).strip()
            if code:
                results.append(
                    {
                        "code": code,
                        "value": _safe_field(fields, 3),
                        "unit": _safe_field(fields, 4),
                        "reference_range": _safe_field(fields, 5),
                        "abnormal": bool(_safe_field(fields, 6)),
                    }
                )

    return {
        "message_id": message_id or sha256_bytes(text.encode("utf-8"))[:24],
        "accession": accession,
        "results": results,
        "protocol": IntegrationEquipment.Protocolo.ASTM_TCP,
    }


def _safe_field(fields: list[str], index: int) -> str:
    if index >= len(fields):
        return ""
    return str(fields[index] or "").strip()
