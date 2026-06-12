from django.db import models


class Method(models.TextChoices):
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
    # Serologia e imunologia (Imunocromatografia definido na secção de parasitologia)
    FLOCULACAO = "Floculacao", "Floculação (não treponêmica)"
    HEMAGLUTINACAO = "Hemaglutinacao", "Hemaglutinação"
    AGLUTINACAO_LATEX = "AglutinacaoLatex", "Aglutinação em Látex"
    IMUNOENSAIO = "Imunoensaio", "Imunoensaio"
    # Coagulação e hemostasia (Coagulometria definido na secção de hematologia)
    METODO_MANUAL = "MetodoManual", "Método Manual"
    IVY_DUKE = "IvyDuke", "Método Ivy / Duke"
    CROMOGENICO = "Cromogenico", "Cromogénico"
    DRVVT = "dRVVT", "dRVVT / Teste de Mistura"

    CULTURA = "Cultura", "Cultura"
    ANTIBIOGRAMA = "Antibiograma", "Antibiograma"
    MICROSCOPICO = "Microscopico", "Microscópico"
    COLORACAO_GRAM = "ColoracaoGram", "Coloração de Gram"
    COLORACAO_ZIEHL = "ColoracaoZiehl", "Ziehl-Neelsen"
    ISOLAMENTO_MICROBIANO = "IsolamentoMicrobiano", "Isolamento Microbiano"
    CULTURA_QUANTITATIVA = "CulturaQuantitativa", "Cultura Quantitativa"
    CULTURA_SELETIVA = "CulturaSeletiva", "Cultura Seletiva"
    CULTURA_SEMIQUANTITATIVA = "CulturaSemiquantitativa", "Cultura Semiquantitativa"
    CULTURA_AUTOMATIZADA = "CulturaAutomatizada", "Cultura Automatizada"
    CULTURA_MICOLOGICA = "CulturaMicologica", "Cultura Micológica"
    EXAME_MICOLOGICO_DIRETO = "ExameMicologicoDireto", "Exame Micológico Direto (KOH)"
    KIRBY_BAUER = "KirbyBauer", "Kirby-Bauer / MIC"

    CITOMETRIA_FLUXO = "CitometriaFluxo", "Citometria de Fluxo"
    HEMATOLOGIA_AUTOMATIZADA = "HematologiaAutomatizada", "Hematologia Automatizada"
    MICROSCOPIA_OPTICA = "MicroscopiaOptica", "Microscopia Óptica"
    COAGULOMETRIA = "Coagulometria", "Coagulometria"

    # Química clínica (bioquímica)
    ENZIMATICO_COLORIMETRICO = "EnzimaticoColorimetrico", "Enzimático Colorimétrico"
    ENZIMATICO_DIRETO = "EnzimaticoDireto", "Enzimático Direto"
    CINETICO_ENZIMATICO = "CineticoEnzimatico", "Cinético Enzimático"
    CINETICO_UV = "CineticoUV", "Cinético UV"
    CINETICO_COLORIMETRICO = "CineticoColorimetrico", "Cinético Colorimétrico"
    JAFFE = "Jaffe", "Jaffé Cinético"
    BIURETO = "Biureto", "Biureto"
    VERDE_BROMOCRESOL = "VerdeBromocresol", "Verde de Bromocresol"
    DIAZO_COLORIMETRICO = "DiazoColorimetrico", "Diazo Colorimétrico"
    IMUNOINIBICAO = "Imunoinibicao", "Imunoinibição"
    ELETRODO_ION_SELETIVO = "EletrodoIonSeletivo", "Eletrodo Íon Seletivo"
    CALCULO = "Calculo", "Cálculo"

    PCR = "PCR", "PCR"
    RT_PCR = "RT_PCR", "RT-PCR"
    PCR_TEMPO_REAL = "PCRTempoReal", "PCR em Tempo Real"
    SEQUENCIAMENTO = "Sequenciamento", "Sequenciamento Genético"
    HIBRIDIZACAO_MOLECULAR = "HibridizacaoMolecular", "Hibridização Molecular"
    GENOTIPAGEM = "Genotipagem", "Genotipagem"
    NAAT = "NAAT", "NAAT (Amplificação de Ácidos Nucleicos)"
    PCR_QUALITATIVO = "PCRQualitativo", "PCR Qualitativo"
    PCR_QUANTITATIVO = "PCRQuantitativo", "PCR Quantitativo"
    PCR_MULTIPLEX = "PCRMultiplex", "PCR Multiplex"
    PCR_MUTACIONAL = "PCRMutacional", "PCR Mutacional"
    PCR_ALELO_ESPECIFICO = "PCRAleloEspecifico", "PCR Alelo-Específico"
    RT_PCR_QUALITATIVO = "RTPCRQualitativo", "RT-PCR Qualitativo"
    RT_PCR_QUANTITATIVO = "RTPCRQuantitativo", "RT-PCR Quantitativo"
    RT_PCR_MULTIPLEX = "RTPCRMultiplex", "RT-PCR Multiplex"
    RT_QPCR = "RTqPCR", "RT-qPCR"

    CROMATOGRAFIA = "Cromatografia", "Cromatografia"
    CROMATOGRAFIA_GASOSA = "CromatografiaGasosa", "Cromatografia Gasosa"
    CROMATOGRAFIA_LIQUIDA = "CromatografiaLiquida", "Cromatografia Líquida"
    HPLC = "HPLC", "Cromatografia Líquida de Alta Eficiência"
    ELETROFORESE = "Eletroforese", "Eletroforese"
    ISOELETROFOCO = "Isoeletrofoque", "Isoeletrofocalização"

    SEDIMENTACAO = "Sedimentacao", "Sedimentação"
    FLUTUACAO = "Flutuacao", "Flutuação"
    KATO_KATZ = "KatoKatz", "Kato-Katz"

    # Parasitologia
    CONCENTRACAO_FORMOL_ETER = "ConcentracaoFormolEter", "Concentração Formol-Éter (Ritchie)"
    FITA_GOMADA = "FitaGomada", "Fita Gomada (Graham)"
    GOTA_ESPESSA = "GotaEspessa", "Gota Espessa"
    ESFREGACO_DELGADO = "EsfregacoDelgado", "Esfregaço Delgado"
    IMUNOCROMATOGRAFIA = "Imunocromatografia", "Imunocromatografia"
    BAERMANN = "Baermann", "Baermann (Cultura Larvária)"

    TIRA_REAGENTE = "TiraReagente", "Tira Reagente"
    ANALISE_MICROSCOPICA = "AnaliseMicroscopica", "Análise Microscópica"
    # Uroanálise / urinálise
    FISICO_QUIMICO_MICROSCOPIA = "FisicoQuimicoMicroscopia", "Físico-químico e Microscopia"
    AVALIACAO_MACROSCOPICA = "AvaliacaoMacroscopica", "Avaliação Macroscópica"
    MICROSCOPIA_SEDIMENTO = "MicroscopiaSedimento", "Microscopia do Sedimento"

    ESPECTROMETRIA_MASSA = "EspectrometriaMassa", "Espectrometria de Massa"
    MALDI_TOF = "MALDI_TOF", "MALDI-TOF"
    RESSONANCIA_MAGNETICA_NUCLEAR = (
        "RessonanciaMagneticaNuclear",
        "Ressonância Magnética Nuclear",
    )


__all__ = ["Method"]
