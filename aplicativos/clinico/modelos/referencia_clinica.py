"""
Motor de interpretação clínica laboratorial.
"""

from dataclasses import dataclass, field
from statistics import mean

# =========================================================
# HELPERS INTERNOS
# =========================================================


def _norm(value: str) -> str:
    """Normaliza texto para comparação."""
    return value.strip().lower()


def _safe_float(value) -> float | None:
    """Converte para float com segurança."""
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


# =========================================================
# INTERVALOS DE REFERÊNCIA
# =========================================================


@dataclass
class IntervaloReferencia:
    valor_minimo: float | None = None
    valor_maximo: float | None = None
    unidade: str | None = None
    critico_baixo: float | None = None
    critico_alto: float | None = None

    sexo: str | None = None
    idade_min: int | None = None
    idade_max: int | None = None


def referencia_aplicavel(ref: IntervaloReferencia, idade: int, sexo: str) -> bool:
    if ref.sexo and ref.sexo != sexo:
        return False
    if ref.idade_min is not None and idade < ref.idade_min:
        return False
    if ref.idade_max is not None and idade > ref.idade_max:
        return False
    return True


# =========================================================
# REFERÊNCIA QUALITATIVA
# =========================================================


@dataclass
class ReferenciaQualitativa:
    valores_normais: list[str]
    valores_alterados: list[str] | None = None
    valores_criticos: list[str] | None = None

    # normalização automática para performance
    normais: set = field(init=False)
    alterados: set = field(init=False, default_factory=set)
    criticos: set = field(init=False, default_factory=set)

    def __post_init__(self):
        self.normais = {_norm(v) for v in self.valores_normais}
        if self.valores_alterados:
            self.alterados = {_norm(v) for v in self.valores_alterados}
        if self.valores_criticos:
            self.criticos = {_norm(v) for v in self.valores_criticos}


# =========================================================
# STATUS PADRONIZADO
# =========================================================


class Status:
    NORMAL = "normal"
    BAIXO = "baixo"
    ALTO = "alto"
    ALTERADO = "alterado"
    CRITICO = "critico"
    INVALIDO = "invalido"


# =========================================================
# AVALIAÇÃO NUMÉRICA
# =========================================================


def avaliar_numerico(valor: float, ref: IntervaloReferencia) -> str:
    if valor is None:
        return Status.INVALIDO

    if ref.critico_baixo is not None and valor < ref.critico_baixo:
        return Status.CRITICO

    if ref.critico_alto is not None and valor > ref.critico_alto:
        return Status.CRITICO

    if ref.valor_minimo is not None and valor < ref.valor_minimo:
        return Status.BAIXO

    if ref.valor_maximo is not None and valor > ref.valor_maximo:
        return Status.ALTO

    return Status.NORMAL


# =========================================================
# AVALIAÇÃO QUALITATIVA
# =========================================================


def avaliar_qualitativo(valor: str, ref: ReferenciaQualitativa) -> str:
    if not isinstance(valor, str):
        return Status.INVALIDO

    v = _norm(valor)

    if v in ref.criticos:
        return Status.CRITICO
    if v in ref.alterados:
        return Status.ALTERADO
    if v in ref.normais:
        return Status.NORMAL

    return Status.ALTERADO


# =========================================================
# SEMI-QUANTITATIVO
# =========================================================

MAPA_SEMIQUANT = {
    "negativo": 0,
    "tracos": 1,
    "+": 2,
    "++": 3,
    "+++": 4,
    "++++": 5,
}


def avaliar_semicuantitativo(valor: str) -> int:
    if not isinstance(valor, str):
        return -1
    return MAPA_SEMIQUANT.get(_norm(valor), -1)


# =========================================================
# DELTA CHECK
# =========================================================


def delta_check(
    valor_atual: float, valor_anterior: float, limite_percentual: float = 30
) -> bool:
    if valor_anterior is None or valor_anterior == 0:
        return False

    variacao = abs(valor_atual - valor_anterior) / abs(valor_anterior) * 100
    return variacao > limite_percentual


# =========================================================
# TENDÊNCIA
# =========================================================


def detectar_tendencia(valores: list[float]) -> str:
    if len(valores) < 3:
        return ""

    if valores[-1] > valores[-2] > valores[-3]:
        return "subindo"
    if valores[-1] < valores[-2] < valores[-3]:
        return "descendo"
    return "estavel"


# =========================================================
# CORES
# =========================================================

CORES_STATUS = {
    Status.NORMAL: "verde",
    Status.BAIXO: "amarelo",
    Status.ALTO: "laranja",
    Status.ALTERADO: "laranja",
    Status.CRITICO: "vermelho",
}


# =========================================================
# INTERPRETAÇÃO CLÍNICA
# =========================================================


def gerar_interpretacao(status: str, delta: bool, tendencia: str) -> str:
    textos = {
        Status.NORMAL: "Resultado dentro dos valores de referência.",
        Status.BAIXO: "Resultado abaixo do intervalo de referência.",
        Status.ALTO: "Resultado acima do intervalo de referência.",
        Status.ALTERADO: "Resultado alterado.",
        Status.CRITICO: "RESULTADO CRÍTICO. Notificar o médico imediatamente.",
    }

    texto = textos.get(status, "")

    if delta:
        texto += " Variação significativa em relação ao exame anterior."
    if tendencia == "subindo":
        texto += " Tendência crescente observada."
    if tendencia == "descendo":
        texto += " Tendência decrescente observada."

    return texto.strip()


# =========================================================
# INTERPRETAÇÃO CENTRAL
# =========================================================


def interpretar_resultado(
    valor: str,
    tipo: str,
    idade: int,
    sexo: str,
    ref_numerica: IntervaloReferencia = None,
    ref_qualitativa: ReferenciaQualitativa = None,
    valor_anterior: float | None = None,
    historico: list[float] | None = None,
) -> dict:
    status = Status.INVALIDO
    delta = False
    tendencia = ""

    if tipo == "numerico" and ref_numerica:
        if referencia_aplicavel(ref_numerica, idade, sexo):
            valor_float = _safe_float(valor)
            if valor_float is None:
                return _resultado_invalido("Valor inválido para avaliação numérica.")

            status = avaliar_numerico(valor_float, ref_numerica)

            if valor_anterior is not None:
                delta = delta_check(valor_float, valor_anterior)

            if historico:
                tendencia = detectar_tendencia(historico)

    elif tipo == "qualitativo" and ref_qualitativa:
        status = avaliar_qualitativo(valor, ref_qualitativa)

    elif tipo == "semicuantitativo":
        escala = avaliar_semicuantitativo(valor)
        status = (
            Status.ALTO
            if escala >= 3
            else Status.ALTERADO if escala == 2 else Status.NORMAL
        )

    cor = CORES_STATUS.get(status, "preto")

    return {
        "status": status,
        "cor": cor,
        "alerta_critico": status == Status.CRITICO,
        "delta_alerta": delta,
        "tendencia": tendencia,
        "interpretacao": gerar_interpretacao(status, delta, tendencia),
    }


def _resultado_invalido(msg: str) -> dict:
    return {
        "status": Status.INVALIDO,
        "cor": "preto",
        "alerta_critico": False,
        "delta_alerta": False,
        "tendencia": "",
        "interpretacao": msg,
    }


# =========================================================
# BASE PARA IA FUTURA
# =========================================================


@dataclass
class DadosClinicosIA:
    idade: int
    sexo: str
    resultados: dict
    historico: list[float]


def resumo_tendencia(historico: list[float]) -> dict:
    if not historico:
        return {}

    return {
        "media": mean(historico),
        "max": max(historico),
        "min": min(historico),
        "tendencia": detectar_tendencia(historico),
    }
