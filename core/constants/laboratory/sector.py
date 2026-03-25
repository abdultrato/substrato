from django.db import models

# =========================================================
# SETORES LABORATORIAIS (COMPLETO)
# =========================================================


class Sector(models.TextChoices):
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


__all__ = ["Sector"]
