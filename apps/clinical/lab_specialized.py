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
