"""Helpers de formset para agrupar itens de resultado por exame no admin."""

from django.forms.models import BaseInlineFormSet


class ResultItemInlineFormSet(BaseInlineFormSet):
    """Formset que pré-carrega relações e expõe agrupamento por exame."""

    def get_queryset(self):
        qs = super().get_queryset()

        return qs.select_related("exam_field", "exam_field__test").order_by(
            "position",
            "exam_field__test__name",
            "exam_field__sequence",
            "exam_field__name",
        )

    # usado para agrupar no template
    def items_by_exam(self):
        grupos = {}

        for form in self.forms:
            campo = form.instance.exam_field
            test = getattr(campo, "test", None) or getattr(campo, "exam", None)
            exam_name = getattr(test, "name", "—") if test else "—"
            grupos.setdefault(exam_name, []).append(form)

        return grupos


# Aliases legados
ResultadoItemInlineFormSet = ResultItemInlineFormSet
itens_por_exam = ResultItemInlineFormSet.items_by_exam
