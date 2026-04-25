"""Requisição de exames laboratoriais ou exames médicos."""

from typing import Type

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import IntegrityError, models, transaction

from core.constants.laboratory.clinical_status import ClinicalStatus
from core.models.base import NoNameCoreModel
from domain.clinical.result_state import ResultState
from domain.clinical.result_state_machine import ResultStateMachine

from .lab_exam import LabExam
from .patient import Patient

User = settings.AUTH_USER_MODEL


class LabRequest(NoNameCoreModel):
    """Cabeçalho de uma solicitação de exames."""

    prefix = "REQ"  # Prefixo para IDs amigáveis

    class Type(models.TextChoices):
        LABORATORY = "LAB", "Laboratório"
        MEDICAL_EXAM = "MED", "Exame médico"

    class Tipo:
        # Compatibilidade legada (português)
        LABORATORIO = "LAB"
        MEDICO = "MED"
        EXAME_MEDICO = "MED"

    class Status:
        # Compatibilidade legada de status.
        PENDENTE = ResultState.PENDING
        EM_ANALISE = ResultState.IN_ANALYSIS
        AGUARDANDO_RESULTADO = ResultState.IN_ANALYSIS
        AGUARDANDO_VALIDACAO = ResultState.AWAITING_VALIDATION
        VALIDADA = ResultState.VALIDATED
        VALIDADO = ResultState.VALIDATED
        REJEITADA = ResultState.REJECTED
        REJEITADO = ResultState.REJECTED

    patient = models.ForeignKey(

        Patient,

        db_column="patient_id",
        on_delete=models.CASCADE,
        related_name="lab_requests",
    )

    requesting_company = models.ForeignKey(

        "entidades.Company",

        db_column="requesting_company_id",
        verbose_name="Empresa solicitante",
        help_text="Empresa que subcontrata os serviços (ex.: medicina ocupacional).",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="requested_lab_requests",
    )

    external_executing_company = models.ForeignKey(

        "entidades.Company",

        db_column="external_executing_company_id",
        verbose_name="Empresa executora externa",
        help_text="Quando a clínica terceiriza a execução para outra empresa.",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="outsourced_lab_requests",
    )

    type = models.CharField(

        db_column="type",

        max_length=3,
        choices=Type.choices,
        default=Type.LABORATORY,
        db_index=True,
    )

    exams = models.ManyToManyField(
        LabExam,
        through="LabRequestItem",
    )

    analyst = models.ForeignKey(

        User,

        db_column="analyst_id",
        verbose_name="O Usuario",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="processed_lab_requests",
    )

    status = models.CharField(

        db_column="status",

        max_length=30,
        choices=ResultState.CHOICES,
        default=ResultState.PENDING,
        db_index=True,
    )

    clinical_status = models.CharField(

        db_column="clinical_status",

        max_length=50,
        choices=ClinicalStatus.choices,
        default=ClinicalStatus.NON_URGENT,
        db_index=True,
    )

    has_critical_result = models.BooleanField(

        db_column="has_critical_result",

        default=False,
        db_index=True,
    )

    class Meta:
        db_table = "clinico_requisicaoanalise"
        ordering = ["-created_at"]
        verbose_name = "Requisição de exam"
        verbose_name_plural = "Requisições de exams"

    # =====================================================
    # INVARIANTES
    # =====================================================

    def _esta_editavel(self):
        return self.status == ResultState.PENDING

    def _verify_terminal_state(self):
        if not self.pk:
            return

        original = self.__class__.all_objects.filter(pk=self.pk).only("status").first()

        if original and original.status in ResultState.TERMINAL:
            raise ValidationError("Requisição finalizada é imutável.")

    # =====================================================
    # SAVE CONTROLADO
    # =====================================================

    def save(self, *args, **kwargs):
        # garantir propagação de tenant
        if not self.tenant_id and self.patient_id:
            self.tenant_id = self.patient.tenant_id

        if self.pk:
            original = self.__class__.all_objects.filter(pk=self.pk).only("patient", "type").first()

            if original and original.patient_id != self.patient_id:
                raise ValidationError("Paciente da requisição é imutável.")

            if original and original.type != self.type:
                raise ValidationError("Tipo/sector da requisição é imutável.")

        self._verify_terminal_state()

        super().save(*args, **kwargs)

    # =====================================================
    # AGGREGATE ROOT
    # =====================================================

    def add_exam(self, exam: LabExam):
        if self.type != self.Type.LABORATORY:
            raise ValidationError("Esta requisição é de exams médicos e não aceita exams laboratoriais.")

        if not self._esta_editavel():
            raise ValidationError("Não é possível adicionar exams após início do processamento.")

        from .lab_request_item import LabRequestItem

        with transaction.atomic():
            try:
                return LabRequestItem.all_objects.create(
                    request=self,
                    exam=exam,
                )

            except IntegrityError as err:
                raise ValidationError("Exame já adicionado à requisição.") from err

    def add_medical_exam(self, medical_exam):
        if self.type != self.Type.MEDICAL_EXAM:
            raise ValidationError("Esta requisição é laboratorial e não aceita exams médicos.")

        if not self._esta_editavel():
            raise ValidationError("Não é possível adicionar exams após início do processamento.")

        from .lab_request_item import LabRequestItem

        with transaction.atomic():
            try:
                return LabRequestItem.all_objects.create(
                    request=self,
                    medical_exam=medical_exam,
                )
            except IntegrityError as err:
                raise ValidationError("Exame médico já adicionado à requisição.") from err

    # =====================================================
    # TRANSIÇÃO DE ESTADO
    # =====================================================

    def transicionar(self, novo_status):
        with transaction.atomic():
            request = LabRequest.all_objects.select_for_update().get(pk=self.pk)

            ResultStateMachine.validate_transition(
                request.status,
                novo_status,
            )

            request.status = novo_status

            request.save(update_fields=["status"])

    # =====================================================
    # RESULTADO
    # =====================================================

    def get_result(self):
        from .result import Result

        return Result.objects.filter(request=self).first()

    def create_result(self):
        from .result import Result

        result, _ = Result.objects.get_or_create(
            request=self,
            defaults={"tenant": self.tenant},
        )
        return result

    def create_automatic_results(self):
        return self.create_result()

    # =====================================================
    # VIEWS/DRF HELPERS
    # =====================================================

    @property
    def medical_exams(self):
        """
        Exames médicos associados via RequisicaoItem.

        Nota: não existe ManyToMany explícito para ExameMedico; essa propriedade
        existe para suportar serialização (API) e manter a regra de "requisição
        por sector" sem duplicar model.
        """
        from .medical_exam import MedicalExam

        return MedicalExam.objects.filter(lab_requests__request=self, lab_requests__deleted=False).distinct()

    @property
    def itens(self):
        # Compatibilidade legada (português) para relation manager.
        return self.items

    # =====================================================
    # SINCRONIZAÇÃO CLÍNICA
    # =====================================================

    def update_clinical_status(self):
        # Não recalcula nem altera requisição já finalizada (imutável).
        if self.status in ResultState.TERMINAL:
            try:
                if hasattr(self, "result") and not self.result.finalized:
                    self.result.finalized = True
                    self.result.save(update_fields=["finalized"])
            except Exception:
                pass
            return

        novo_status_clinico = ClinicalStatus.NON_URGENT
        possui_critico = False
        novo_status_fluxo = ResultState.PENDING
        result_finalized = False

        if hasattr(self, "result"):
            result = self.result
            itens = result.items.all()

            stats = itens.aggregate(
                total=models.Count("id"),
                criticos=models.Count("id", filter=models.Q(critical_alert=True)),
                urgentes=models.Count("id", filter=models.Q(clinical_status=ClinicalStatus.URGENT)),
                muito_urgentes=models.Count("id", filter=models.Q(clinical_status=ClinicalStatus.VERY_URGENT)),
                pendentes=models.Count("id", filter=models.Q(status=ResultState.PENDING)),
                aguardando=models.Count("id", filter=models.Q(status=ResultState.AWAITING_VALIDATION)),
                validados=models.Count("id", filter=models.Q(status=ResultState.VALIDATED)),
            )

            total = int(stats.get("total") or 0)
            criticos = int(stats.get("criticos") or 0)
            urgentes = int(stats.get("urgentes") or 0)
            muito_urgentes = int(stats.get("muito_urgentes") or 0)

            possui_critico = criticos > 0

            if total == 0:
                novo_status_clinico = ClinicalStatus.NON_URGENT
                novo_status_fluxo = ResultState.PENDING
            else:
                if possui_critico:
                    novo_status_clinico = ClinicalStatus.EXTREMELY_URGENT
                elif muito_urgentes > 0:
                    novo_status_clinico = ClinicalStatus.VERY_URGENT
                elif urgentes > 0:
                    novo_status_clinico = ClinicalStatus.URGENT
                else:
                    novo_status_clinico = ClinicalStatus.NON_URGENT

                pendentes = int(stats.get("pendentes") or 0)
                aguardando = int(stats.get("aguardando") or 0)
                validados = int(stats.get("validados") or 0)

                # Sincroniza o status geral da requisição com o fluxo dos itens:
                # PENDENTE -> EM_ANALISE -> AGUARDANDO_VALIDACAO -> VALIDADO
                if validados == total:
                    novo_status_fluxo = ResultState.VALIDATED
                elif (validados + aguardando) == total:
                    novo_status_fluxo = ResultState.AWAITING_VALIDATION
                elif pendentes == total:
                    novo_status_fluxo = ResultState.PENDING
                else:
                    novo_status_fluxo = ResultState.IN_ANALYSIS

            result_finalized = novo_status_fluxo == ResultState.VALIDATED

            if result.finalized != result_finalized:
                result.finalized = result_finalized
                result.save(update_fields=["finalized"])

        update_fields = []
        if self.clinical_status != novo_status_clinico:
            self.clinical_status = novo_status_clinico
            update_fields.append("clinical_status")

        if self.has_critical_result != possui_critico:
            self.has_critical_result = possui_critico
            update_fields.append("has_critical_result")

        if self.status != novo_status_fluxo:
            self.status = novo_status_fluxo
            update_fields.append("status")

        if update_fields:
            self.save(update_fields=update_fields)

    def apply_status(self, new_status):
        if self.status == new_status:
            return self
        self.status = new_status
        self.save(update_fields=["status"])
        return self

    @property
    def patient_tenant(self):
        if self.patient:
            return getattr(self.patient, "tenant", None)
        return None

    _verificar_status_terminal = _verify_terminal_state
    adicionar_exam = add_exam
    adicionar_medical_exam = add_medical_exam
    criar_result = create_result
    criar_resultados_automaticos = create_automatic_results
    aplicar_status = apply_status
    exams_medicos = medical_exams
    atualizar_clinical_status = update_clinical_status
    tenant_do_patient = patient_tenant

    def __str__(self):
        return f"{self.custom_id} - {self.patient.name}"
