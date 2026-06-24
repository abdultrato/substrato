"""Serviços para recuperar valores de referência clínicos por sexo/idade."""

from django.db.models import Q

from apps.clinical.models.clinical_reference import ClinicalReference


class ClinicalReferenceResolver:
    @staticmethod
    def resolve(exam_field, patient):
        from apps.clinical.models.lab_exam_field import LabExamField

        # ClinicalReference referencia o LabExamField clínico. Result items que
        # usam laboratorio.LabTestField trazem as faixas inline (reference_low/
        # high, critical_low/high) e são interpretados via field.interpret_result,
        # por isso não há referência externa a consultar (e filtrar a FK com um
        # LabTestField lançaria "Must be LabExamField instance").
        if not isinstance(exam_field, LabExamField):
            return None

        age_in_days = patient.idade_em_dias()

        references = ClinicalReference.objects.filter(exam_field=exam_field)

        if patient.gender:
            references = references.filter(Q(sex=patient.gender) | Q(sex__isnull=True))

        if age_in_days is not None:
            references = references.filter(
                Q(minimum_age_days__lte=age_in_days) | Q(minimum_age_days__isnull=True),
                Q(maximum_age_days__gte=age_in_days) | Q(maximum_age_days__isnull=True),
            )

        references = references.order_by("-sex", "-minimum_age_days")
        return references.first()


ResolverReferenciaClinica = ClinicalReferenceResolver
ClinicalReferenceResolver.resolver = staticmethod(ClinicalReferenceResolver.resolve)
