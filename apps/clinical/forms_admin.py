from django.forms.models import BaseInlineFormSet


class ResultItemInlineFormSet(BaseInlineFormSet):
    def get_queryset(self):
        qs = super().get_queryset()

        return qs.select_related("exam_field", "exam_field__exam").order_by(
            "exam_field__exam__name", "exam_field__name"
        )

    # used para agrupar no template
    def items_by_exam(self):
        grupos = {}

        for form in self.forms:
            exam = form.instance.exam_field.exam.name

            grupos.setdefault(exam, []).append(form)

        return grupos


ResultadoItemInlineFormSet = ResultItemInlineFormSet
itens_por_exam = ResultItemInlineFormSet.items_by_exam
