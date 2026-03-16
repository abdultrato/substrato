from django.db.models import Q

from aplicativos.clinico.modelos.referencia_clinica import ReferenciaClinica


class ResolverReferenciaClinica:
    @staticmethod
    def resolver(exame_campo, paciente):
        idade = paciente.idade_em_dias()

        referencias = ReferenciaClinica.objects.filter(exame_campo=exame_campo)

        # filtro por sexo
        if paciente.genero:
            referencias = referencias.filter(Q(sexo=paciente.genero) | Q(sexo__isnull=True))

        # filtro por idade
        if idade is not None:
            referencias = referencias.filter(
                Q(idade_minima_dias__lte=idade) | Q(idade_minima_dias__isnull=True),
                Q(idade_maxima_dias__gte=idade) | Q(idade_maxima_dias__isnull=True),
            )

        # prioriza referências mais específicas
        referencias = referencias.order_by("-sexo", "-idade_minima_dias")

        return referencias.first()
