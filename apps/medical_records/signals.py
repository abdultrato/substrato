from __future__ import annotations

from django.core.exceptions import ValidationError
from django.db.models.signals import m2m_changed
from django.dispatch import receiver

from .models.medical_record_entry import MedicalRecordEntry


def _resolve_single_doctor(consultations_qs):
    doctors = set(consultations_qs.exclude(doctor__isnull=True).values_list("doctor_id", flat=True))
    if len(doctors) == 1:
        return next(iter(doctors))
    if len(doctors) == 0:
        return None
    raise ValidationError("As consultations vinculadas devem pertencer ao mesmo médico.")


@receiver(m2m_changed, sender=MedicalRecordEntry.consultations.through)
def sincronizar_cardex_consultations(sender, instance, action, pk_set=None, **kwargs):
    """
    Garante consistência:
    - consultations do Cardex devem ser do mesmo patient e tenant
    - médico do Cardex é derivado das consultations (quando disponível)
    """

    if action not in {"pre_add", "post_add", "post_remove", "post_clear"}:
        return

    if not instance.pk:
        return

    # pre_add: valida as consultations que serão adicionadas
    if action == "pre_add" and pk_set:
        qs = instance.consultations.model.objects.filter(pk__in=list(pk_set))
        for c in qs:
            if instance.tenant_id and c.tenant_id != instance.tenant_id:
                raise ValidationError({"consultations": "Consulta e Cardex devem pertencer ao mesmo tenant."})
            if instance.patient_id and c.patient_id != instance.patient_id:
                raise ValidationError({"consultations": "Consulta e Cardex devem ser do mesmo patient."})

        # valida médico único considerando existentes + novos
        atuais = instance.consultations.all()
        medicos = set(atuais.exclude(doctor__isnull=True).values_list("doctor_id", flat=True))
        medicos |= set(qs.exclude(doctor__isnull=True).values_list("doctor_id", flat=True))
        if len(medicos) > 1:
            raise ValidationError(
                {"consultations": "Não é permitido associar consultations de médicos diferentes ao mesmo Cardex."}
            )

    # post_*: sincroniza médico derivado
    if action in {"post_add", "post_remove", "post_clear"}:
        try:
            doctor_id = _resolve_single_doctor(instance.consultations.all())
        except ValidationError as exc:
            raise ValidationError({"consultations": str(exc)}) from exc

        if instance.doctor_id != doctor_id:
            instance.doctor_id = doctor_id
            instance.save(update_fields=["doctor"])


_resolver_doctor_unico = _resolve_single_doctor
