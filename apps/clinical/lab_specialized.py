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
