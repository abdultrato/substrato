from django.db import transaction
from aplicativos.faturamento.modelos.fatura import Fatura


@transaction.atomic
def criar_fatura(paciente):
    return Fatura.objects.create(paciente=paciente)
