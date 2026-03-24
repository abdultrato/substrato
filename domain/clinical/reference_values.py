from django.db.models import Q

from apps.clinical.models.clinical_reference import ClinicalReference


class ClinicalReferenceResolver:
    @staticmethod
    def resolve(exam_field, patient):
        age_in_days = patient.idade_em_dias()

        references = ClinicalReference.objects.filter(exame_campo=exam_field)

        if patient.genero:
            references = references.filter(Q(sexo=patient.genero) | Q(sexo__isnull=True))

        if age_in_days is not None:
            references = references.filter(
                Q(idade_minima_dias__lte=age_in_days) | Q(idade_minima_dias__isnull=True),
                Q(idade_maxima_dias__gte=age_in_days) | Q(idade_maxima_dias__isnull=True),
            )

        references = references.order_by("-sexo", "-idade_minima_dias")
        return references.first()


ResolverReferenciaClinica = ClinicalReferenceResolver
ClinicalReferenceResolver.resolver = staticmethod(ClinicalReferenceResolver.resolve)
