from __future__ import annotations

from django.core.exceptions import ValidationError
from django.db.models.signals import m2m_changed
from django.dispatch import receiver

from .modelos.registro_prontuario import RegistroProntuario


def _resolver_medico_unico(consultas_qs):
    medicos = set(
        consultas_qs.exclude(medico__isnull=True).values_list("medico_id", flat=True)
    )
    if len(medicos) == 1:
        return next(iter(medicos))
    if len(medicos) == 0:
        return None
    raise ValidationError("As consultas vinculadas devem pertencer ao mesmo médico.")


@receiver(m2m_changed, sender=RegistroProntuario.consultas.through)
def sincronizar_cardex_consultas(sender, instance, action, pk_set=None, **kwargs):
    """
    Garante consistência:
    - consultas do Cardex devem ser do mesmo paciente e inquilino
    - médico do Cardex é derivado das consultas (quando disponível)
    """

    if action not in {"pre_add", "post_add", "post_remove", "post_clear"}:
        return

    if not instance.pk:
        return

    # pre_add: valida as consultas que serão adicionadas
    if action == "pre_add" and pk_set:
        qs = instance.consultas.model.objects.filter(pk__in=list(pk_set))
        for c in qs:
            if instance.inquilino_id and c.inquilino_id != instance.inquilino_id:
                raise ValidationError(
                    {"consultas": "Consulta e Cardex devem pertencer ao mesmo inquilino."}
                )
            if instance.paciente_id and c.paciente_id != instance.paciente_id:
                raise ValidationError(
                    {"consultas": "Consulta e Cardex devem ser do mesmo paciente."}
                )

        # valida médico único considerando existentes + novos
        atuais = instance.consultas.all()
        medicos = set(
            atuais.exclude(medico__isnull=True).values_list("medico_id", flat=True)
        )
        medicos |= set(qs.exclude(medico__isnull=True).values_list("medico_id", flat=True))
        if len(medicos) > 1:
            raise ValidationError(
                {"consultas": "Não é permitido associar consultas de médicos diferentes ao mesmo Cardex."}
            )

    # post_*: sincroniza médico derivado
    if action in {"post_add", "post_remove", "post_clear"}:
        try:
            medico_id = _resolver_medico_unico(instance.consultas.all())
        except ValidationError as exc:
            raise ValidationError({"consultas": str(exc)})

        if instance.medico_id != medico_id:
            instance.medico_id = medico_id
            instance.save(update_fields=["medico"])

