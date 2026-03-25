from django.db import models


class Provenance(models.TextChoices):
    AMBULATORIO = "Ambulatório", "Ambulatório"
    CLINICA_EXTERNA = "Clínica Externa", "Clínica Externa"
    MEDICINA_OCUPACIONAL = "Medicina Ocupacional", "Medicina Ocupacional"
    MATERNIDADE = "Maternidade", "Maternidade"
    GINECOLOGIA = "Ginecologia", "Ginecologia"
    PEDIATRIA = "Pediatria", "Pediatria"
    BANCO_SOCORROS = "Banco de Socorros", "Banco de Socorros"
    CONSULTA_EXTERNA = "Consulta Externa", "Consulta Externa"
    UROLOGIA = "Urologia", "Urologia"
    CIRURGIA = "Cirurgia", "Cirurgia"
    DENTARIA = "Dentária", "Dentária"
    OFTALMOLOGIA = "Oftalmologia", "Oftalmologia"
    OUTRO = "Outro", "Outro"


__all__ = ["Provenance"]
