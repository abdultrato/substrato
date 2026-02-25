from django.db import models

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


class UnidadeField(models.CharField):
    def __init__(self, *args, **kwargs):
        kwargs.setdefault("max_length", 20)
        kwargs.setdefault("blank", True)
        kwargs.setdefault("null", True)
        super().__init__(*args, **kwargs)


# =========================================================
# MÉTODOS LABORATORIAIS (COMPLETO)
# =========================================================


class Metodo(models.TextChoices):
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


class MetodoField(models.CharField):
    def __init__(self, *args, **kwargs):
        kwargs.setdefault("max_length", 40)
        kwargs.setdefault("choices", Metodo.choices)
        kwargs.setdefault("blank", True)
        kwargs.setdefault("null", True)
        super().__init__(*args, **kwargs)


# =========================================================
# SETORES LABORATORIAIS (COMPLETO)
# =========================================================


class Setor(models.TextChoices):
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


class SetorField(models.CharField):
    def __init__(self, *args, **kwargs):
        kwargs.setdefault("max_length", 40)
        kwargs.setdefault("choices", Setor.choices)
        kwargs.setdefault("blank", True)
        kwargs.setdefault("null", True)
        super().__init__(*args, **kwargs)
