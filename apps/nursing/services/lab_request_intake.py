"""Sincronização de requisições laboratoriais para registos de entrada de enfermagem."""

from __future__ import annotations

import unicodedata
from typing import TYPE_CHECKING

from core.constants.laboratory.clinical_status import ClinicalStatus

from ..models import NursingRecord

if TYPE_CHECKING:
    from apps.clinical.models.lab_request import LabRequest


def _normalize(value: str) -> str:
    value = (value or "").strip().lower()
    if not value:
        return ""
    value = unicodedata.normalize("NFD", value)
    return "".join(ch for ch in value if unicodedata.category(ch) != "Mn")


def _origin_group_metadata(lab_request: "LabRequest") -> tuple[str, bool]:
    """
    Retorna (label_origem, pode_gerar_registro_automatico).

    Regra funcional: geração automática quando a requisição LAB é criada por
    receção/recepção ou médico.
    """
    creator = getattr(lab_request, "created_by", None)
    if creator is None:
        # Sem autor explícito (ex.: seed/import) — mantém sincronização ativa.
        return "Sistema", True

    try:
        raw_groups = list(creator.groups.values_list("name", flat=True))
    except Exception:
        raw_groups = []

    normalized = {_normalize(group_name) for group_name in raw_groups if group_name}

    reception_keys = {
        "recepcionista",
        "rececionista",
        "recepcao",
        "rececao",
        "reception",
    }
    doctor_keys = {
        "medico",
        "medicina",
        "doctor",
        "medicina ocupacional",
    }

    if normalized & reception_keys:
        return "Receção", True
    if normalized & doctor_keys:
        return "Médico", True

    if getattr(creator, "is_superuser", False):
        return "Administrador", True

    return "Outro", False


def _priority_from_clinical_status(lab_request: "LabRequest") -> str:
    urgent_statuses = {
        ClinicalStatus.URGENT,
        ClinicalStatus.VERY_URGENT,
        ClinicalStatus.EXTREMELY_URGENT,
        ClinicalStatus.EMERGENCY,
    }
    low_statuses = {
        ClinicalStatus.NON_URGENT,
        ClinicalStatus.NORMAL,
        ClinicalStatus.ROUTINE,
    }

    status = getattr(lab_request, "clinical_status", None)
    if status in urgent_statuses:
        return NursingRecord.Prioridade.URGENTE
    if status in low_statuses:
        return NursingRecord.Prioridade.BAIXA
    return NursingRecord.Prioridade.NORMAL


def _format_observation(lab_request: "LabRequest", collection_guidance: list[dict]) -> str:
    intro = (
        f"Entrada automática de enfermagem para coleta: {lab_request.custom_id}. "
        f"Paciente: {lab_request.patient.name}."
    )
    if not collection_guidance:
        return f"{intro} Sem exames laboratoriais ativos no momento."

    lines = [intro]
    for exam_entry in collection_guidance:
        exam_name = exam_entry.get("exam_name") or "Exame sem nome"
        sample_options = exam_entry.get("sample_options") or []
        if not sample_options:
            lines.append(f"{exam_name}: sem opção de amostra configurada.")
            continue

        details = []
        for sample in sample_options:
            sample_name = sample.get("sample_name") or "Amostra"
            bottle = sample.get("bottle_type_label") or sample.get("bottle_type") or "Frasco não definido"
            volume = sample.get("minimum_volume_ml") or "0"
            details.append(f"{sample_name} | {bottle} | volume mínimo: {volume} ml")

        lines.append(f"{exam_name}: " + "; ".join(details))

    return "\n".join(lines)


def sync_lab_collection_record(lab_request: "LabRequest") -> NursingRecord | None:
    """
    Mantém um registo de entrada de enfermagem sincronizado com a requisição LAB.
    """
    if lab_request.type != lab_request.Type.LABORATORY:
        return None

    origin_role, allowed_origin = _origin_group_metadata(lab_request)
    if not allowed_origin:
        return None

    collection_guidance = lab_request.build_collection_guidance()
    record_name = f"Coleta laboratorial {lab_request.custom_id}"

    defaults = {
        "tenant": lab_request.tenant,
        "patient": lab_request.patient,
        "name": record_name,
        "priority": _priority_from_clinical_status(lab_request),
        "record_kind": NursingRecord.RecordKind.LAB_COLLECTION_REQUEST,
        "origin_role": origin_role,
        "observation": _format_observation(lab_request, collection_guidance),
        "collection_guidance": collection_guidance,
        "deleted": False,
        "deleted_at": None,
        "deleted_by": None,
    }

    record, _ = NursingRecord.all_objects.update_or_create(
        lab_request=lab_request,
        defaults=defaults,
    )
    return record
