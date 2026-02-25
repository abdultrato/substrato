import re

from django.core.exceptions import ValidationError as ve
from django.db import models as m

# =========================================================
# TELEFONE (MOÇAMBIQUE READY)
# =========================================================


def normalizar_telefone(valor: str | None):
    if not valor:
        return valor
    return re.sub(r"\D", "", valor)


def validar_telefone_mz(valor: str | None):
    if not valor:
        return valor

    valor = normalizar_telefone(valor)

    if len(valor) != 9:
        raise ve("Telefone deve conter 9 dígitos.")

    if not valor.startswith(("82", "83", "84", "85", "86", "87")):
        raise ve("Número inválido para Moçambique.")

    return valor


class TelefoneField(m.CharField):
    def __init__(self, *args, **kwargs):
        kwargs.setdefault("max_length", 9)
        kwargs.setdefault("blank", True)
        kwargs.setdefault("null", True)
        super().__init__(*args, **kwargs)

    def clean(self, value, model_instance):
        value = super().clean(value, model_instance)
        return validar_telefone_mz(value)


# =========================================================
# NUIT
# =========================================================


def validar_nuit(valor: str | None):
    if not valor:
        return valor

    valor = valor.strip()

    if not valor.isdigit():
        raise ve("NUIT deve conter apenas números.")

    if len(valor) != 9:
        raise ve("NUIT deve conter 9 dígitos.")

    if valor == "000000000":
        raise ve("NUIT inválido.")

    return valor


class NuitField(m.CharField):
    def __init__(self, *args, **kwargs):
        kwargs.setdefault("max_length", 9)
        kwargs.setdefault("unique", True)
        kwargs.setdefault("blank", True)
        kwargs.setdefault("null", True)
        super().__init__(*args, **kwargs)

    def clean(self, value, model_instance):
        value = super().clean(value, model_instance)
        return validar_nuit(value)


# =========================================================
# EMAIL NORMALIZADO
# =========================================================


class LowerEmailField(m.EmailField):
    def clean(self, value, model_instance):
        value = super().clean(value, model_instance)
        if value:
            value = value.strip().lower()
        return value


# =========================================================
# NOME PADRONIZADO
# =========================================================


class NomeField(m.CharField):
    def clean(self, value, model_instance):
        value = super().clean(value, model_instance)
        if value:
            value = value.strip().title()
        return value


# =========================================================
# MONEY FIELD
# =========================================================


class Currency(m.TextChoices):
    MZN = "MZN", "Metical"
    USD = "USD", "US Dollar"
    EUR = "EUR", "Euro"
    ZAR = "ZAR", "Rand Sul-Africano"


class MoneyField(m.DecimalField):
    """
    Campo monetário com moeda automática.
    Cria <campo>_currency automaticamente.
    """

    def __init__(self, *args, **kwargs):
        self.currency_default = kwargs.pop("currency_default", Currency.MZN)

        kwargs.setdefault("max_digits", 12)
        kwargs.setdefault("decimal_places", 2)

        super().__init__(*args, **kwargs)

    def contribute_to_class(self, cls, name, **kwargs):
        super().contribute_to_class(cls, name)

        cls.add_to_class(
            f"{name}_currency",
            m.CharField(
                max_length=3,
                choices=Currency.choices,
                default=self.currency_default,
            ),
        )


# =========================================================
# UNIDADES LABORATORIAIS
# =========================================================

UNIDADES_PADRAO = {
    "g/dl",
    "mg/dl",
    "mmol/l",
    "µmol/l",
    "cel/mm3",
    "x10³/µl",
    "×10⁶/µL",
    "%",
    "u/l",
    "ph",
}


def normalizar_unidade(valor: str | None):
    if not valor:
        return valor
    valor = valor.strip().replace("μ", "µ")
    return valor


def validar_unidade(valor: str | None):
    if not valor:
        return valor

    if valor.lower() not in UNIDADES_PADRAO:
        raise ve(f"Unidade inválida: {valor}")

    return valor


class UnidadeField(m.CharField):
    def __init__(self, *args, **kwargs):
        kwargs.setdefault("max_length", 20)
        kwargs.setdefault("blank", True)
        kwargs.setdefault("null", True)
        super().__init__(*args, **kwargs)

    def clean(self, value, model_instance):
        value = super().clean(value, model_instance)
        return validar_unidade(normalizar_unidade(value))


# =========================================================
# MÉTODOS LABORATORIAIS (COMPLETO)
# =========================================================


class Metodo(m.TextChoices):
    ENZIMATICO = "Enzimatico", "Enzimático"
    COLORIMETRICO = "Colorimetrico", "Colorimétrico"
    ESPECTROFOTOMETRICO = "Espectrofotometrico", "Espectrofotométrico"
    TURBIDIMETRICO = "Turbidimetrico", "Turbidimétrico"
    NEFELOMETRICO = "Nefelometrico", "Nefelométrico"
    POTENCIOMETRICO = "Potenciometrico", "Potenciométrico"
    ELETROQUIMICO = "Eletroquimico", "Eletroquímico"

    ELISA = "ELISA", "ELISA"
    QUIMIOLUMINESCENCIA = "Quimioluminescencia", "Quimioluminescência"
    ELETROQUIMIOLUMINESCENCIA = "Eletroquimioluminescencia", "Eletroquimioluminescência"
    IMUNOFLUORESCENCIA = "Imunofluorescencia", "Imunofluorescência"
    IMUNOTURBIDIMETRIA = "Imunoturbidimetria", "Imunoturbidimetria"
    AGLUTINACAO = "Aglutinacao", "Aglutinação"

    CULTURA = "Cultura", "Cultura"
    ANTIBIOGRAMA = "Antibiograma", "Antibiograma"
    MICROSCOPICO = "Microscopico", "Microscópico"
    COLORACAO_GRAM = "ColoracaoGram", "Coloração de Gram"
    COLORACAO_ZIEHL = "ColoracaoZiehl", "Ziehl-Neelsen"
    ISOLAMENTO_MICROBIANO = "IsolamentoMicrobiano", "Isolamento Microbiano"

    CITOMETRIA_FLUXO = "CitometriaFluxo", "Citometria de Fluxo"
    HEMATOLOGIA_AUTOMATIZADA = "HematologiaAutomatizada", "Hematologia Automatizada"
    MICROSCOPIA_OPTICA = "MicroscopiaOptica", "Microscopia Óptica"

    PCR = "PCR", "PCR"
    RT_PCR = "RT_PCR", "RT-PCR"
    PCR_TEMPO_REAL = "PCRTempoReal", "PCR em Tempo Real"
    SEQUENCIAMENTO = "Sequenciamento", "Sequenciamento Genético"
    HIBRIDIZACAO_MOLECULAR = "HibridizacaoMolecular", "Hibridização Molecular"
    GENOTIPAGEM = "Genotipagem", "Genotipagem"

    CROMATOGRAFIA = "Cromatografia", "Cromatografia"
    CROMATOGRAFIA_GASOSA = "CromatografiaGasosa", "Cromatografia Gasosa"
    CROMATOGRAFIA_LIQUIDA = "CromatografiaLiquida", "Cromatografia Líquida"
    HPLC = "HPLC", "Cromatografia Líquida de Alta Eficiência"
    ELETROFORESE = "Eletroforese", "Eletroforese"
    ISOELETROFOCO = "Isoeletrofoque", "Isoeletrofocalização"

    SEDIMENTACAO = "Sedimentacao", "Sedimentação"
    FLUTUACAO = "Flutuacao", "Flutuação"
    KATO_KATZ = "KatoKatz", "Kato-Katz"

    TIRA_REAGENTE = "TiraReagente", "Tira Reagente"
    ANALISE_MICROSCOPICA = "AnaliseMicroscopica", "Análise Microscópica"

    ESPECTROMETRIA_MASSA = "EspectrometriaMassa", "Espectrometria de Massa"
    MALDI_TOF = "MALDI_TOF", "MALDI-TOF"
    RESSONANCIA_MAGNETICA_NUCLEAR = (
        "RessonanciaMagneticaNuclear",
        "Ressonância Magnética Nuclear",
    )


class MetodoField(m.CharField):
    def __init__(self, *args, **kwargs):
        kwargs.setdefault("max_length", 40)
        kwargs.setdefault("choices", Metodo.choices)
        kwargs.setdefault("blank", True)
        kwargs.setdefault("null", True)
        super().__init__(*args, **kwargs)


# =========================================================
# SETORES LABORATORIAIS (COMPLETO)
# =========================================================


class Setor(m.TextChoices):
    HEMATOLOGIA = "Hematologia", "Hematologia"
    BIOQUIMICA = "Bioquimica", "Bioquímica"
    MICROBIOLOGIA = "Microbiologia", "Microbiologia"
    IMUNOLOGIA = "Imunologia", "Imunologia"
    SEROLOGIA = "Serologia", "Serologia"
    PARASITOLOGIA = "Parasitologia", "Parasitologia"

    BIOLOGIA_MOLECULAR = "BiologiaMolecular", "Biologia Molecular"
    TOXICOLOGIA = "Toxicologia", "Toxicologia"
    HORMONIOS = "Hormonios", "Hormônios e Endocrinologia"
    MARCADORES_TUMORAIS = "MarcadoresTumorais", "Marcadores Tumorais"
    COAGULACAO = "Coagulacao", "Coagulação"
    URINALISE = "Urinalise", "Urinálise"
    LIQUIDOS_CORPORAIS = "LiquidosCorporais", "Líquidos Corporais"
    GASOMETRIA = "Gasometria", "Gasometria"
    NUTRICAO_CLINICA = "NutricaoClinica", "Nutrição Clínica"

    MICOLOGIA = "Micologia", "Micologia"
    VIROLOGIA = "Virologia", "Virologia"
    BACTERIOLOGIA = "Bacteriologia", "Bacteriologia"

    BANCO_SANGUE = "BancoSangue", "Banco de Sangue"
    IMUNO_HEMATOLOGIA = "ImunoHematologia", "Imuno-hematologia"

    TRIAGEM = "Triagem", "Triagem Laboratorial"
    RECEPCAO_AMOSTRAS = "RecepcaoAmostras", "Recepção de Amostras"
    CONTROLE_QUALIDADE = "ControleQualidade", "Controle de Qualidade"

    PESQUISA = "Pesquisa", "Pesquisa Laboratorial"
    OUTRO = "Outro", "Outro"


class SetorField(m.CharField):
    def __init__(self, *args, **kwargs):
        kwargs.setdefault("max_length", 40)
        kwargs.setdefault("choices", Setor.choices)
        kwargs.setdefault("blank", True)
        kwargs.setdefault("null", True)
        super().__init__(*args, **kwargs)
