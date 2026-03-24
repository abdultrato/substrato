from django.db import models


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
