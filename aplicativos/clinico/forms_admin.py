from django.forms.models import BaseInlineFormSet


class ResultadoItemInlineFormSet(BaseInlineFormSet):
    def get_queryset(self):
        qs = super().get_queryset()

        return qs.select_related("exame_campo", "exame_campo__exame").order_by(
            "exame_campo__exame__nome", "exame_campo__nome"
        )

    # usado para agrupar no template
    def itens_por_exame(self):
        grupos = {}

        for form in self.forms:
            exame = form.instance.exame_campo.exame.nome

            grupos.setdefault(exame, []).append(form)

        return grupos
