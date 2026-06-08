"""Casos de uso de gestão de camas e internamentos de enfermagem (§12.20)."""

from __future__ import annotations

from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone

from apps.nursing.models import Ward, WardAdmission, WardBed


def _append(current: str, label: str, text: str) -> str:
    if not text:
        return current
    return f"{current}\n[{label}] {text}".strip()


class WardAdmissionWorkflowService:
    """Internamento → cama → admissão → transferência → alta (a ocupação da cama é o internamento ativo)."""

    # ------------------------------------------------------------------ #
    # Enfermaria / cama
    # ------------------------------------------------------------------ #
    @staticmethod
    @transaction.atomic
    def activate_ward(ward: Ward) -> Ward:
        ward.active = True
        ward.save()
        return ward

    @staticmethod
    @transaction.atomic
    def deactivate_ward(ward: Ward) -> Ward:
        ward.active = False
        ward.save()
        return ward

    @staticmethod
    @transaction.atomic
    def activate_bed(bed: WardBed) -> WardBed:
        bed.active = True
        bed.save()
        return bed

    @staticmethod
    @transaction.atomic
    def block_bed(bed: WardBed) -> WardBed:
        if WardAdmission.objects.filter(bed=bed, active=True, deleted=False).exists():
            raise ValidationError("Não é possível bloquear uma cama com internamento ativo.")
        bed.active = False
        bed.save()
        return bed

    @staticmethod
    def _ensure_bed_available(bed: WardBed) -> None:
        if not bed.active:
            raise ValidationError({"bed": "Cama inativa/bloqueada não pode receber paciente."})
        if not bed.ward.active:
            raise ValidationError({"bed": "Enfermaria inativa não pode receber novos internamentos."})
        if WardAdmission.objects.filter(bed=bed, active=True, deleted=False).exists():
            raise ValidationError({"bed": "Cama já está ocupada por um internamento ativo."})

    # ------------------------------------------------------------------ #
    # Internamento
    # ------------------------------------------------------------------ #
    @staticmethod
    @transaction.atomic
    def admit_patient(
        *,
        bed: WardBed,
        patient,
        admission_date=None,
        expected_discharge_date=None,
        estimated_observation_hours=None,
        notes: str = "",
    ) -> WardAdmission:
        """Admite o paciente numa cama disponível (§12.20). O modelo impede duas admissões ativas na mesma cama."""
        WardAdmissionWorkflowService._ensure_bed_available(bed)
        return WardAdmission.objects.create(
            tenant=bed.tenant,
            bed=bed,
            patient=patient,
            admission_date=admission_date or timezone.now(),
            expected_discharge_date=expected_discharge_date,
            estimated_observation_hours=estimated_observation_hours,
            active=True,
            notes=notes,
        )

    @staticmethod
    @transaction.atomic
    def discharge_patient(admission: WardAdmission, *, condition: str = "", notes: str = "") -> WardAdmission:
        """Dá alta (o modelo bloqueia alta com procedimentos de enfermagem pendentes) (§12.20)."""
        if not admission.active or admission.discharged_at:
            raise ValidationError("Internamento já encerrado.")
        admission.discharged_at = timezone.now()
        if condition:
            admission.notes = _append(admission.notes, "Alta", condition)
        if notes:
            admission.notes = _append(admission.notes, "Obs", notes)
        admission.save()  # save() define active=False; clean() bloqueia se houver procedimentos pendentes
        return admission

    @staticmethod
    @transaction.atomic
    def register_death(admission: WardAdmission, *, notes: str = "") -> WardAdmission:
        if not admission.active or admission.discharged_at:
            raise ValidationError("Internamento já encerrado.")
        admission.discharged_at = timezone.now()
        admission.notes = _append(admission.notes, "Óbito", notes)
        admission.save()
        return admission

    @staticmethod
    @transaction.atomic
    def transfer_patient(admission: WardAdmission, *, new_bed: WardBed, reason: str = "") -> WardAdmission:
        """Transfere o paciente: liberta a cama atual e cria nova admissão (preserva histórico) (§12.20)."""
        if not admission.active:
            raise ValidationError("Apenas internamentos ativos podem ser transferidos.")
        if new_bed.pk == admission.bed_id:
            raise ValidationError({"new_bed": "A cama de destino deve ser diferente da atual."})
        WardAdmissionWorkflowService._ensure_bed_available(new_bed)

        # Encerra a ocupação atual sem registar "alta" (transferência preserva o cuidado).
        admission.active = False
        admission.notes = _append(admission.notes, "Transferência", f"Para cama {new_bed.number}. {reason}".strip())
        admission.save()

        return WardAdmission.objects.create(
            tenant=new_bed.tenant,
            bed=new_bed,
            patient=admission.patient,
            admission_date=timezone.now(),
            estimated_observation_hours=admission.estimated_observation_hours,
            active=True,
            notes=_append("", "Origem", f"Transferido da cama {admission.bed.number}. {reason}".strip()),
        )
