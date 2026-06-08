from __future__ import annotations

from datetime import timedelta

from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone

from apps.veterinary.models import (
    VeterinaryAdmission,
    VeterinaryAnimal,
    VeterinaryAppointment,
    VeterinaryLabExam,
    VeterinaryLabRequest,
    VeterinaryLabRequestItem,
    VeterinaryMedicalRecord,
    VeterinaryPrescription,
    VeterinaryVaccination,
    VeterinaryVaccine,
)


def _stamp(author_name: str, text: str) -> str:
    moment = timezone.now().strftime("%Y-%m-%d %H:%M")
    who = f" {author_name}" if author_name else ""
    return f"[{moment}]{who}: {text}".strip()


class VeterinaryWorkflowService:
    """Casos de uso da jornada veterinária (§2.18): transições de estado e orquestração clínica.

    Tutor = responsável financeiro (campo ``owner_*`` no animal); Animal = paciente clínico.
    """

    # ------------------------------------------------------------------ #
    # Animal / prontuário
    # ------------------------------------------------------------------ #
    @staticmethod
    @transaction.atomic
    def register_animal(
        *,
        tenant,
        name: str,
        owner_name: str,
        species: str = VeterinaryAnimal._meta.get_field("species").default,
        open_record: bool = True,
        **extra,
    ) -> VeterinaryAnimal:
        """Cadastra o animal e abre o prontuário inicial (§2.18 cadastrar_animal)."""
        animal = VeterinaryAnimal.objects.create(
            tenant=tenant,
            name=name,
            owner_name=owner_name,
            species=species,
            **extra,
        )
        if open_record:
            VeterinaryMedicalRecord.objects.create(
                tenant=tenant,
                animal=animal,
                status=VeterinaryMedicalRecord.Status.ACTIVE,
            )
        return animal

    # ------------------------------------------------------------------ #
    # Consulta (agenda) e atendimento
    # ------------------------------------------------------------------ #
    @staticmethod
    @transaction.atomic
    def confirm_appointment(appointment: VeterinaryAppointment) -> VeterinaryAppointment:
        if appointment.status != VeterinaryAppointment.Status.SCHEDULED:
            raise ValidationError("Só é possível confirmar consultas agendadas.")
        appointment.status = VeterinaryAppointment.Status.CONFIRMED
        appointment.save()
        return appointment

    @staticmethod
    @transaction.atomic
    def start_attendance(
        appointment: VeterinaryAppointment,
        *,
        veterinarian=None,
        anamnesis: str = "",
    ) -> VeterinaryMedicalRecord:
        """Inicia o atendimento e abre/recupera o prontuário da consulta."""
        startable = {
            VeterinaryAppointment.Status.CONFIRMED,
            VeterinaryAppointment.Status.CHECKED_IN,
            VeterinaryAppointment.Status.SCHEDULED,
        }
        if appointment.status not in startable:
            raise ValidationError("A consulta não pode iniciar atendimento no estado atual.")
        if appointment.animal.status == VeterinaryAnimal.Status.DECEASED:
            raise ValidationError("Animal em óbito não pode receber nova consulta clínica.")

        resolved_vet = veterinarian or appointment.veterinarian

        record = (
            VeterinaryMedicalRecord.objects.filter(appointment=appointment)
            .exclude(status=VeterinaryMedicalRecord.Status.CANCELLED)
            .order_by("-opened_at")
            .first()
        )
        if record is None:
            record = VeterinaryMedicalRecord.objects.create(
                tenant=appointment.tenant,
                animal=appointment.animal,
                veterinarian=resolved_vet,
                appointment=appointment,
                status=VeterinaryMedicalRecord.Status.ACTIVE,
                anamnesis=anamnesis,
            )
        elif record.status == VeterinaryMedicalRecord.Status.DRAFT:
            record.status = VeterinaryMedicalRecord.Status.ACTIVE
            record.save()

        appointment.status = VeterinaryAppointment.Status.IN_PROGRESS
        appointment.save()
        return record

    @staticmethod
    @transaction.atomic
    def finalize_appointment(appointment: VeterinaryAppointment) -> VeterinaryAppointment:
        if appointment.status in {
            VeterinaryAppointment.Status.CANCELLED,
            VeterinaryAppointment.Status.NO_SHOW,
        }:
            raise ValidationError("Consultas canceladas ou com falta não podem ser finalizadas.")
        appointment.status = VeterinaryAppointment.Status.COMPLETED
        appointment.save()

        now = timezone.now()
        for record in appointment.medical_records.filter(status=VeterinaryMedicalRecord.Status.ACTIVE):
            record.status = VeterinaryMedicalRecord.Status.FINALIZED
            record.closed_at = now
            record.save()
        return appointment

    @staticmethod
    @transaction.atomic
    def cancel_appointment(appointment: VeterinaryAppointment, *, reason: str = "") -> VeterinaryAppointment:
        if appointment.status == VeterinaryAppointment.Status.COMPLETED:
            raise ValidationError("Uma consulta concluída não pode ser cancelada.")
        if not reason.strip():
            raise ValidationError({"reason": "Informe o motivo do cancelamento."})
        appointment.status = VeterinaryAppointment.Status.CANCELLED
        appointment.notes = f"{appointment.notes}\n[Cancelamento] {reason}".strip()
        appointment.save()
        return appointment

    @staticmethod
    @transaction.atomic
    def mark_no_show(appointment: VeterinaryAppointment) -> VeterinaryAppointment:
        if appointment.status in {
            VeterinaryAppointment.Status.COMPLETED,
            VeterinaryAppointment.Status.CANCELLED,
        }:
            raise ValidationError("Não é possível marcar falta numa consulta concluída ou cancelada.")
        appointment.status = VeterinaryAppointment.Status.NO_SHOW
        appointment.save()
        return appointment

    # ------------------------------------------------------------------ #
    # Vacinação
    # ------------------------------------------------------------------ #
    @staticmethod
    def _compute_next_due(vaccine: VeterinaryVaccine, administered_at):
        if vaccine.default_interval_days:
            return (administered_at or timezone.now()).date() + timedelta(days=vaccine.default_interval_days)
        return None

    @staticmethod
    @transaction.atomic
    def register_vaccination(
        *,
        animal: VeterinaryAnimal,
        vaccine: VeterinaryVaccine,
        veterinarian=None,
        lot_number: str = "",
        administered_at=None,
        notes: str = "",
    ) -> VeterinaryVaccination:
        """Aplica a vacina, calcula o reforço e regista o lote (§2.18 registrar_vacinacao)."""
        if not vaccine.active:
            raise ValidationError({"vaccine": "Vacina inativa não pode ser aplicada."})
        if animal.status == VeterinaryAnimal.Status.DECEASED:
            raise ValidationError("Animal em óbito não pode ser vacinado.")
        moment = administered_at or timezone.now()
        # A compatibilidade de espécie é validada no clean() do modelo.
        return VeterinaryVaccination.objects.create(
            tenant=animal.tenant,
            animal=animal,
            vaccine=vaccine,
            veterinarian=veterinarian,
            status=VeterinaryVaccination.Status.APPLIED,
            administered_at=moment,
            next_due_date=VeterinaryWorkflowService._compute_next_due(vaccine, moment),
            lot_number=lot_number,
            notes=notes,
        )

    @staticmethod
    @transaction.atomic
    def apply_scheduled_vaccination(
        vaccination: VeterinaryVaccination, *, lot_number: str | None = None, veterinarian=None
    ) -> VeterinaryVaccination:
        if vaccination.status == VeterinaryVaccination.Status.APPLIED:
            return vaccination
        if vaccination.status == VeterinaryVaccination.Status.CANCELLED:
            raise ValidationError("Vacinação cancelada não pode ser aplicada.")
        now = timezone.now()
        vaccination.status = VeterinaryVaccination.Status.APPLIED
        vaccination.administered_at = now
        if lot_number is not None:
            vaccination.lot_number = lot_number
        if veterinarian is not None:
            vaccination.veterinarian = veterinarian
        vaccination.next_due_date = VeterinaryWorkflowService._compute_next_due(vaccination.vaccine, now)
        vaccination.save()
        return vaccination

    @staticmethod
    @transaction.atomic
    def cancel_vaccination(vaccination: VeterinaryVaccination, *, reason: str = "") -> VeterinaryVaccination:
        if not reason.strip():
            raise ValidationError({"reason": "Informe o motivo do cancelamento."})
        vaccination.status = VeterinaryVaccination.Status.CANCELLED
        vaccination.notes = f"{vaccination.notes}\n[Cancelamento] {reason}".strip()
        vaccination.save()
        return vaccination

    @staticmethod
    @transaction.atomic
    def register_adverse_reaction(
        vaccination: VeterinaryVaccination, *, description: str
    ) -> VeterinaryVaccination:
        if not description.strip():
            raise ValidationError({"description": "Descreva a reação adversa."})
        vaccination.adverse_reaction = description
        vaccination.save()
        return vaccination

    # ------------------------------------------------------------------ #
    # Laboratório
    # ------------------------------------------------------------------ #
    @staticmethod
    @transaction.atomic
    def create_lab_request(
        *,
        animal: VeterinaryAnimal,
        exams: list[VeterinaryLabExam],
        veterinarian=None,
        appointment=None,
        record=None,
        priority: str = VeterinaryLabRequest.Priority.ROUTINE,
        clinical_notes: str = "",
    ) -> VeterinaryLabRequest:
        """Cria a requisição com os itens de exame (§2.18 solicitar_exame_laboratorial)."""
        if not exams:
            raise ValidationError({"exams": "Selecione ao menos um exame."})
        request = VeterinaryLabRequest.objects.create(
            tenant=animal.tenant,
            animal=animal,
            veterinarian=veterinarian,
            appointment=appointment,
            record=record,
            priority=priority,
            status=VeterinaryLabRequest.Status.REQUESTED,
            clinical_notes=clinical_notes,
        )
        for exam in exams:
            if not exam.active:
                raise ValidationError({"exams": f"Exame inativo não pode ser solicitado: {exam}."})
            # A compatibilidade de espécie é validada no clean() do item.
            VeterinaryLabRequestItem.objects.create(
                tenant=animal.tenant,
                request=request,
                exam=exam,
                status=VeterinaryLabRequestItem.Status.REQUESTED,
            )
        return request

    @staticmethod
    @transaction.atomic
    def collect_sample(request: VeterinaryLabRequest, *, sample_identifier: str = "") -> VeterinaryLabRequest:
        if request.status not in {
            VeterinaryLabRequest.Status.REQUESTED,
            VeterinaryLabRequest.Status.COLLECTED,
        }:
            raise ValidationError("A requisição não está num estado que permita colheita.")
        now = timezone.now()
        request.status = VeterinaryLabRequest.Status.COLLECTED
        request.save()
        for item in request.items.filter(status=VeterinaryLabRequestItem.Status.REQUESTED):
            item.status = VeterinaryLabRequestItem.Status.COLLECTED
            item.collected_at = now
            if sample_identifier and not item.sample_identifier:
                item.sample_identifier = sample_identifier
            item.save()
        return request

    @staticmethod
    @transaction.atomic
    def start_processing(request: VeterinaryLabRequest) -> VeterinaryLabRequest:
        if request.status != VeterinaryLabRequest.Status.COLLECTED:
            raise ValidationError("Só é possível processar requisições com amostra colhida.")
        request.status = VeterinaryLabRequest.Status.PROCESSING
        request.save()
        for item in request.items.filter(status=VeterinaryLabRequestItem.Status.COLLECTED):
            item.status = VeterinaryLabRequestItem.Status.PROCESSING
            item.save()
        return request

    @staticmethod
    @transaction.atomic
    def register_item_result(
        item: VeterinaryLabRequestItem,
        *,
        result_value: str = "",
        result_summary: str = "",
        reference_range: str = "",
    ) -> VeterinaryLabRequestItem:
        """Regista e valida o resultado do exame; conclui a requisição quando todos resolverem (§2.18)."""
        if item.status in {
            VeterinaryLabRequestItem.Status.CANCELLED,
            VeterinaryLabRequestItem.Status.RESULTED,
        }:
            raise ValidationError("Este item já foi resolvido ou cancelado.")
        if not (result_value or result_summary).strip():
            raise ValidationError({"result": "Informe o resultado do exame."})
        item.result_value = result_value
        item.result_summary = result_summary
        if reference_range:
            item.reference_range = reference_range
        item.status = VeterinaryLabRequestItem.Status.RESULTED
        item.resulted_at = timezone.now()
        item.save()

        request = item.request
        outstanding = request.items.exclude(
            status__in=[
                VeterinaryLabRequestItem.Status.RESULTED,
                VeterinaryLabRequestItem.Status.CANCELLED,
            ]
        )
        if not outstanding.exists() and request.status not in {
            VeterinaryLabRequest.Status.COMPLETED,
            VeterinaryLabRequest.Status.CANCELLED,
        }:
            request.status = VeterinaryLabRequest.Status.COMPLETED
            request.save()
        return item

    @staticmethod
    @transaction.atomic
    def cancel_lab_request(request: VeterinaryLabRequest, *, reason: str = "") -> VeterinaryLabRequest:
        if request.status == VeterinaryLabRequest.Status.COMPLETED:
            raise ValidationError("Uma requisição concluída não pode ser cancelada.")
        request.status = VeterinaryLabRequest.Status.CANCELLED
        if reason:
            request.notes = f"{request.notes}\n[Cancelamento] {reason}".strip()
        request.save()
        for item in request.items.exclude(
            status__in=[
                VeterinaryLabRequestItem.Status.RESULTED,
                VeterinaryLabRequestItem.Status.CANCELLED,
            ]
        ):
            item.status = VeterinaryLabRequestItem.Status.CANCELLED
            item.save()
        return request

    # ------------------------------------------------------------------ #
    # Internamento
    # ------------------------------------------------------------------ #
    @staticmethod
    @transaction.atomic
    def admit_animal(
        *,
        animal: VeterinaryAnimal,
        veterinarian,
        reason: str,
        appointment=None,
        ward: str = "",
        cage: str = "",
        diagnosis: str = "",
        care_plan: str = "",
    ) -> VeterinaryAdmission:
        """Interna o animal sob responsável clínico (§2.18 internar_animal)."""
        if not reason.strip():
            raise ValidationError({"reason": "O internamento exige motivo clínico."})
        if veterinarian is None:
            raise ValidationError({"veterinarian": "O internamento exige um veterinário responsável."})
        if animal.status == VeterinaryAnimal.Status.DECEASED:
            raise ValidationError("Animal em óbito não pode ser internado.")
        return VeterinaryAdmission.objects.create(
            tenant=animal.tenant,
            animal=animal,
            veterinarian=veterinarian,
            appointment=appointment,
            status=VeterinaryAdmission.Status.ADMITTED,
            reason=reason,
            ward=ward,
            cage=cage,
            diagnosis=diagnosis,
            care_plan=care_plan,
        )

    _ACTIVE_ADMISSION = {
        VeterinaryAdmission.Status.ADMITTED,
        VeterinaryAdmission.Status.OBSERVATION,
    }

    @staticmethod
    @transaction.atomic
    def register_admission_evolution(
        admission: VeterinaryAdmission, *, text: str, author_name: str = ""
    ) -> VeterinaryAdmission:
        if admission.status not in VeterinaryWorkflowService._ACTIVE_ADMISSION:
            raise ValidationError("Só é possível evoluir internamentos ativos.")
        if not text.strip():
            raise ValidationError({"text": "Descreva a evolução."})
        admission.notes = f"{admission.notes}\n{_stamp(author_name, text)}".strip()
        admission.save()
        return admission

    @staticmethod
    @transaction.atomic
    def discharge_admission(
        admission: VeterinaryAdmission, *, condition: str = "", summary: str = ""
    ) -> VeterinaryAdmission:
        if admission.status not in VeterinaryWorkflowService._ACTIVE_ADMISSION:
            raise ValidationError("Só é possível dar alta a internamentos ativos.")
        if not condition.strip():
            raise ValidationError({"condition": "Informe a condição de alta."})
        admission.status = VeterinaryAdmission.Status.DISCHARGED
        admission.discharged_at = timezone.now()
        admission.discharge_summary = summary or condition
        admission.notes = f"{admission.notes}\n[Alta] {condition}".strip()
        admission.save()
        return admission

    @staticmethod
    @transaction.atomic
    def transfer_admission(
        admission: VeterinaryAdmission, *, destination: str = "", reason: str = ""
    ) -> VeterinaryAdmission:
        if admission.status not in VeterinaryWorkflowService._ACTIVE_ADMISSION:
            raise ValidationError("Só é possível transferir internamentos ativos.")
        if not destination.strip():
            raise ValidationError({"destination": "Informe o destino da transferência."})
        admission.status = VeterinaryAdmission.Status.TRANSFERRED
        admission.discharged_at = timezone.now()
        admission.notes = f"{admission.notes}\n[Transferência → {destination}] {reason}".strip()
        admission.save()
        return admission

    @staticmethod
    @transaction.atomic
    def register_admission_death(admission: VeterinaryAdmission, *, notes: str = "") -> VeterinaryAdmission:
        if admission.status in {
            VeterinaryAdmission.Status.DISCHARGED,
            VeterinaryAdmission.Status.CANCELLED,
        }:
            raise ValidationError("Internamento já encerrado.")
        now = timezone.now()
        admission.status = VeterinaryAdmission.Status.DECEASED
        admission.discharged_at = now
        if notes:
            admission.notes = f"{admission.notes}\n[Óbito] {notes}".strip()
        admission.save()

        animal = admission.animal
        if animal.status != VeterinaryAnimal.Status.DECEASED:
            animal.status = VeterinaryAnimal.Status.DECEASED
            animal.save()
        return admission

    # ------------------------------------------------------------------ #
    # Receitas
    # ------------------------------------------------------------------ #
    @staticmethod
    @transaction.atomic
    def emit_prescription(prescription: VeterinaryPrescription) -> VeterinaryPrescription:
        if prescription.status not in {
            VeterinaryPrescription.Status.DRAFT,
            VeterinaryPrescription.Status.ACTIVE,
        }:
            raise ValidationError("Apenas receitas em rascunho podem ser emitidas.")
        if not prescription.items.exists():
            raise ValidationError("A receita precisa de pelo menos um item.")
        if prescription.veterinarian_id is None:
            raise ValidationError({"veterinarian": "A receita precisa de veterinário responsável."})
        prescription.status = VeterinaryPrescription.Status.ACTIVE
        prescription.issued_at = timezone.now()
        prescription.save()
        return prescription

    @staticmethod
    @transaction.atomic
    def cancel_prescription(prescription: VeterinaryPrescription, *, reason: str = "") -> VeterinaryPrescription:
        if prescription.status == VeterinaryPrescription.Status.COMPLETED:
            raise ValidationError("Uma receita concluída não pode ser cancelada.")
        prescription.status = VeterinaryPrescription.Status.CANCELLED
        if reason:
            prescription.notes = f"{prescription.notes}\n[Cancelamento] {reason}".strip()
        prescription.save()
        return prescription

    @staticmethod
    @transaction.atomic
    def complete_prescription(prescription: VeterinaryPrescription) -> VeterinaryPrescription:
        if prescription.status != VeterinaryPrescription.Status.ACTIVE:
            raise ValidationError("Só é possível concluir receitas ativas.")
        prescription.status = VeterinaryPrescription.Status.COMPLETED
        prescription.save()
        return prescription
