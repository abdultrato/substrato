"""Métodos laboratoriais com sector de resultado próprio.

Exames cujo método é de microbiologia/molecular/baciloscopia não são preenchidos
com campos genéricos (bioquímica/hematologia) — têm a sua própria área dedicada
(Culturas, Baciloscopia, Biologia Molecular). Este módulo centraliza esse
mapeamento para o gerador de result items e para a resposta da API.
"""

# método (LabExam.method) -> chave de sector especializado
SPECIALIZED_METHOD_SECTORS: dict[str, str] = {
    # Baciloscopia (BAAR / Ziehl-Neelsen)
    "ColoracaoZiehl": "afb",
    # Culturas (microbiologia)
    "Cultura": "culture",
    "CulturaAutomatizada": "culture",
    "CulturaMicologica": "culture",
    "CulturaQuantitativa": "culture",
    "CulturaSeletiva": "culture",
    "CulturaSemiquantitativa": "culture",
    # Biologia Molecular (PCR / GeneXpert / NAAT / hibridização)
    "NAAT": "molecular",
    "PCR": "molecular",
    "PCRAleloEspecifico": "molecular",
    "PCRMultiplex": "molecular",
    "PCRMutacional": "molecular",
    "PCRQualitativo": "molecular",
    "PCRQuantitativo": "molecular",
    "PCRTempoReal": "molecular",
    "RTPCRMultiplex": "molecular",
    "RTPCRQualitativo": "molecular",
    "RTPCRQuantitativo": "molecular",
    "RTqPCR": "molecular",
    "HibridizacaoMolecular": "molecular",
    "Genotipagem": "molecular",
    "Sequenciamento": "molecular",
}

# metadados de cada sector (rótulo + link no frontend Next)
SPECIALIZED_SECTOR_META: dict[str, dict[str, str]] = {
    "afb": {"label": "Baciloscopia (BAAR)", "href": "/clinical-laboratory/afb-smears"},
    "culture": {"label": "Culturas (Microbiologia)", "href": "/clinical-laboratory/cultures"},
    "molecular": {"label": "Biologia Molecular / GeneXpert", "href": "/clinical-laboratory/molecular"},
}

SPECIALIZED_METHODS = frozenset(SPECIALIZED_METHOD_SECTORS)


def specialized_sector_for_method(method: str | None) -> str | None:
    """Devolve a chave do sector especializado para o método, ou None."""
    return SPECIALIZED_METHOD_SECTORS.get((method or "").strip())


def _record_status_label(sector: str, record) -> str:
    fn = getattr(record, "get_status_display", None)
    if callable(fn):
        try:
            value = fn()
            if value:
                return value
        except Exception:
            pass
    if sector == "afb":
        grade = getattr(record, "get_grade_display", None)
        if callable(grade):
            return f"Baciloscopia: {grade()}"
    if sector == "molecular":
        det = getattr(record, "get_detection_display", None)
        if callable(det):
            return f"Molecular: {det()}"
    return "Registado"


def resolve_sector_link(request_item, *, persist: bool = True) -> dict | None:
    """Estado do sector para um item de requisição de método especializado.

    Liga (e opcionalmente persiste) o item ao ``LabOrderItem`` do LIS por
    exame partilhado (LabTest) + paciente, resolve o registo específico
    (cultura/baciloscopia/molecular), o seu estado e um deep-link. Devolve
    ``None`` se o exame não for de método especializado.
    """
    exam = getattr(request_item, "exam", None)
    sector = specialized_sector_for_method(getattr(exam, "method", None))
    if not sector:
        return None

    from apps.clinical_laboratory.models import LabOrderItem  # import local (evita ciclos)

    meta = SPECIALIZED_SECTOR_META.get(sector, {})
    state = {
        "sector": sector,
        "sector_label": meta.get("label", ""),
        "href": meta.get("href", ""),  # por defeito: queue do sector
        "status": "Não iniciado",
        "record_id": None,
    }

    order_item = getattr(request_item, "sector_order_item", None)
    if order_item is None and exam is not None:
        patient_id = getattr(getattr(request_item, "request", None), "patient_id", None)
        if patient_id:
            order_item = (
                LabOrderItem.objects.filter(test=exam, order__patient_id=patient_id)
                .select_related("order")
                .order_by("-created_at")
                .first()
            )
            if order_item is not None and persist:
                request_item.sector_order_item = order_item
                request_item.save(update_fields=["sector_order_item", "updated_at"])

    if order_item is None:
        return state

    if sector == "culture":
        record = order_item.cultures.order_by("-created_at").first()
        base = "/clinical-laboratory/cultures"
    elif sector == "afb":
        record = order_item.afb_smears.order_by("-created_at").first()
        base = "/clinical-laboratory/afb-smears"
    else:
        record = order_item.molecular_results.order_by("-created_at").first()
        base = "/clinical-laboratory/molecular"

    if record is not None:
        state["record_id"] = record.id
        state["href"] = f"{base}/{record.id}"
        state["status"] = _record_status_label(sector, record)
    else:
        # O pedido existe no LIS mas ainda não há registo (amostra por receber).
        state["status"] = "Aguarda processamento no sector"

    return state


# --- Inclusão no laudo comum (registado = validado) -------------------------

# Estados de cultura considerados finalizados (validados) para o laudo.
_CULTURE_FINAL_STATES = frozenset(
    {"CRESCIMENTO", "SEM_CRESCIMENTO", "POSITIVA", "NEGATIVA", "CONCLUIDA"}
)


def _specialized_record(order_item, sector):
    if sector == "culture":
        return order_item.cultures.order_by("-created_at").first()
    if sector == "afb":
        return order_item.afb_smears.order_by("-created_at").first()
    return order_item.molecular_results.order_by("-created_at").first()


def _specialized_ready(sector, record) -> bool:
    """Registado = validado: BAAR/molecular quando executados; cultura quando finalizada."""
    if record is None:
        return False
    if sector == "culture":
        return getattr(record, "status", None) in _CULTURE_FINAL_STATES
    return getattr(record, "performed_at", None) is not None


def _afb_result_text(record) -> str:
    parts = [record.get_grade_display()]
    if (record.afb_count or "").strip():
        parts.append(record.afb_count.strip())
    return " · ".join(parts)


def _fmt_quant(value) -> str:
    if value is None:
        return ""
    try:
        return str(int(value)) if value == value.to_integral_value() else str(value.normalize())
    except (AttributeError, ValueError):
        return str(value)


def _molecular_result_text(record) -> str:
    assay = record.assay
    detection = record.detection
    if assay in ("CV_HIV", "CV_HEPATITE"):
        if detection == "DETETADO":
            q = _fmt_quant(record.quantitative_value)
            unit = record.unit or "cópias/mL"
            return f"Detetado — {q} {unit}" if q else "Detetado"
        if detection == "NAO_DETETADO":
            return "Indetetável"
        return record.get_detection_display()
    if assay == "GENEXPERT_MTB_RIF":
        if detection == "DETETADO":
            return f"MTB detetado · {record.get_rif_resistance_display()}"
        if detection == "NAO_DETETADO":
            return "MTB não detetado"
        return record.get_detection_display()
    parts = [record.get_detection_display()]
    q = _fmt_quant(record.quantitative_value)
    if q:
        parts.append(f"{q} {record.unit or ''}".strip())
    return " · ".join(parts)


def _culture_result_text(record) -> str:
    lines = [record.get_status_display()]
    outcomes = {"positive": "Positiva", "negative": "Negativa", "contaminated": "Contaminada"}
    for plate in record.culture_plates or []:
        if not isinstance(plate, dict):
            continue
        label = outcomes.get(plate.get("outcome"))
        if not label:
            continue
        medium = plate.get("medium") or plate.get("code") or "Meio"
        result_text = (plate.get("result_text") or "").strip()
        extra = f" — {result_text}" if result_text and result_text != medium else ""
        lines.append(f"{medium}: {label}{extra}")
    return "; ".join(lines)


def _specialized_result_text(sector, record) -> str:
    if sector == "afb":
        return _afb_result_text(record)
    if sector == "molecular":
        return _molecular_result_text(record)
    return _culture_result_text(record)


def collect_request_specialized_results(request) -> list[dict]:
    """Resultados especializados prontos (validados) ligados a uma requisição,
    para incluir no laudo comum. Cada item: exam_name, method, sector, text."""
    from apps.clinical_laboratory.models import LabOrderItem

    out: list[dict] = []
    seen: set[tuple] = set()
    patient_id = getattr(request, "patient_id", None)
    for item in request.items.select_related("exam", "sector_order_item").order_by("position", "id"):
        exam = getattr(item, "exam", None)
        sector = specialized_sector_for_method(getattr(exam, "method", None))
        if not sector or exam is None:
            continue
        order_item = getattr(item, "sector_order_item", None)
        if order_item is None and patient_id:
            order_item = (
                LabOrderItem.objects.filter(test=exam, order__patient_id=patient_id)
                .order_by("-created_at")
                .first()
            )
        if order_item is None:
            continue
        record = _specialized_record(order_item, sector)
        if not _specialized_ready(sector, record):
            continue
        key = (sector, record.id)
        if key in seen:
            continue
        seen.add(key)
        out.append(
            {
                "sector": sector,
                "exam_name": exam.name,
                "method": exam.method or "",
                "text": _specialized_result_text(sector, record),
            }
        )
    return out


def request_has_specialized_results(request) -> bool:
    return bool(collect_request_specialized_results(request))
