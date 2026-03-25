from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import IntegrityError, models, transaction

from core.constants.laboratory.clinical_status import StatusClinico
from core.models.base import NoNameCoreModel
from domain.clinical.result_state import ResultState
from domain.clinical.result_state_machine import ResultStateMachine

from .lab_exam import LabExam
from .patient import Patient

User = settings.AUTH_USER_MODEL


class LabRequest(NoNameCoreModel):
    prefixo = "REQ"

    class Type(models.TextChoices):
        LABORATORIO = "LAB", "Laboratório"
        EXAME_MEDICO = "MED", "Exame médico"

    Tipo = Type

    paciente = models.ForeignKey(
        Patient,
        on_delete=models.CASCADE,
        related_name="requisicoes",
    )

    empresa_solicitante = models.ForeignKey(
        "entidades.Company",
        verbose_name="Empresa solicitante",
        help_text="Empresa que subcontrata os serviços (ex.: medicina ocupacional).",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="requisicoes_solicitadas",
    )

    empresa_executora_externa = models.ForeignKey(
        "entidades.Company",
        verbose_name="Empresa executora externa",
        help_text="Quando a clínica terceiriza a execução para outra empresa.",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="requisicoes_terceirizadas",
    )

    tipo = models.CharField(
        max_length=3,
        choices=Type.choices,
        default=Type.LABORATORIO,
        db_index=True,
    )

    exames = models.ManyToManyField(
        LabExam,
        through="LabRequestItem",
    )

    analista = models.ForeignKey(
        User,
        verbose_name="O Usuario",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="requisicoes_processadas",
    )

    estado = models.CharField(
        max_length=30,
        choices=ResultState.CHOICES,
        default=ResultState.PENDING,
        db_index=True,
    )

    status_clinico = models.CharField(
        max_length=50,
        choices=StatusClinico.choices,
        default=StatusClinico.NAO_URGENTE,
        db_index=True,
    )

    possui_resultado_critico = models.BooleanField(
        default=False,
        db_index=True,
    )

    class Meta:
        db_table = "clinico_requisicaoanalise"
        ordering = ["-criado_em"]
        verbose_name = "Requisição de exame"
        verbose_name_plural = "Requisições de exames"

    # =====================================================
    # INVARIANTES
    # =====================================================

    def _esta_editavel(self):
        return self.estado == ResultState.PENDING

    def _verify_terminal_state(self):
        if not self.pk:
            return

        original = self.__class__.all_objects.filter(pk=self.pk).only("estado").first()

        if original and original.estado in ResultState.TERMINAL:
            raise ValidationError("Requisição finalizada é imutável.")

    # =====================================================
    # SAVE CONTROLADO
    # =====================================================

    def save(self, *args, **kwargs):
        # garantir propagação de tenant
        if not self.inquilino_id and self.paciente_id:
            self.inquilino_id = self.paciente.inquilino_id

        if self.pk:
            original = self.__class__.all_objects.filter(pk=self.pk).only("paciente", "tipo").first()

            if original and original.paciente_id != self.paciente_id:
                raise ValidationError("Paciente da requisição é imutável.")

            if original and original.tipo != self.tipo:
                raise ValidationError("Tipo/setor da requisição é imutável.")

        self._verify_terminal_state()

        super().save(*args, **kwargs)

    # =====================================================
    # AGGREGATE ROOT
    # =====================================================

    def add_exam(self, exame: LabExam):
        if self.tipo != self.Tipo.LABORATORIO:
            raise ValidationError("Esta requisição é de exames médicos e não aceita exames laboratoriais.")

        if not self._esta_editavel():
            raise ValidationError("Não é possível adicionar exames após início do processamento.")

        from .lab_request_item import LabRequestItem

        with transaction.atomic():
            try:
                return LabRequestItem.all_objects.create(
                    requisicao=self,
                    exame=exame,
                )

            except IntegrityError as err:
                raise ValidationError("Exame já adicionado à requisição.") from err

    def add_medical_exam(self, exame_medico):
        if self.tipo != self.Tipo.EXAME_MEDICO:
            raise ValidationError("Esta requisição é laboratorial e não aceita exames médicos.")

        if not self._esta_editavel():
            raise ValidationError("Não é possível adicionar exames após início do processamento.")

        from .lab_request_item import LabRequestItem

        with transaction.atomic():
            try:
                return LabRequestItem.all_objects.create(
                    requisicao=self,
                    exame_medico=exame_medico,
                )
            except IntegrityError as err:
                raise ValidationError("Exame médico já adicionado à requisição.") from err

    # =====================================================
    # TRANSIÇÃO DE ESTADO
    # =====================================================

    def transicionar(self, novo_estado):
        with transaction.atomic():
            requisicao = LabRequest.all_objects.select_for_update().get(pk=self.pk)

            ResultStateMachine.validate_transition(
                requisicao.estado,
                novo_estado,
            )

            requisicao.estado = novo_estado

            requisicao.save(update_fields=["estado"])

    # =====================================================
    # RESULTADO
    # =====================================================

    def get_result(self):
        from .result import Result

        return Result.objects.filter(requisicao=self).first()

    def create_result(self):
        from .result import Result

        return Result.objects.create(
            requisicao=self,
            inquilino=self.inquilino,
        )

    # =====================================================
    # VIEWS/DRF HELPERS
    # =====================================================

    @property
    def medical_exams(self):
        """
        Exames médicos associados via RequisicaoItem.

        Nota: não existe ManyToMany explícito para ExameMedico; essa propriedade
        existe para suportar serialização (API) e manter a regra de "requisição
        por setor" sem duplicar modelo.
        """
        from .medical_exam import MedicalExam

        return MedicalExam.objects.filter(requisicoes__requisicao=self, requisicoes__deletado=False).distinct()

    # =====================================================
    # SINCRONIZAÇÃO CLÍNICA
    # =====================================================

    def update_clinical_status(self):
        # Não recalcula nem altera requisição já finalizada (imutável).
        if self.estado in ResultState.TERMINAL:
            try:
                if hasattr(self, "resultado") and not self.resultado.finalizado:
                    self.resultado.finalizado = True
                    self.resultado.save(update_fields=["finalizado"])
            except Exception:
                pass
            return

        novo_status = StatusClinico.NAO_URGENTE
        possui_critico = False
        novo_estado = ResultState.PENDING
        resultado_finalizado = False

        if hasattr(self, "resultado"):
            resultado = self.resultado
            itens = resultado.itens.all()

            stats = itens.aggregate(
                total=models.Count("id"),
                criticos=models.Count("id", filter=models.Q(alerta_critico=True)),
                urgentes=models.Count("id", filter=models.Q(status_clinico=StatusClinico.URGENTE)),
                muito_urgentes=models.Count("id", filter=models.Q(status_clinico=StatusClinico.MUITO_URGENTE)),
                pendentes=models.Count("id", filter=models.Q(estado=ResultState.PENDING)),
                aguardando=models.Count("id", filter=models.Q(estado=ResultState.AWAITING_VALIDATION)),
                validados=models.Count("id", filter=models.Q(estado=ResultState.VALIDATED)),
            )

            total = int(stats.get("total") or 0)
            criticos = int(stats.get("criticos") or 0)
            urgentes = int(stats.get("urgentes") or 0)
            muito_urgentes = int(stats.get("muito_urgentes") or 0)

            possui_critico = criticos > 0

            if total == 0:
                novo_status = StatusClinico.NAO_URGENTE
                novo_estado = ResultState.PENDING
            else:
                if possui_critico:
                    novo_status = StatusClinico.URGENTISSIMO
                elif muito_urgentes > 0:
                    novo_status = StatusClinico.MUITO_URGENTE
                elif urgentes > 0:
                    novo_status = StatusClinico.URGENTE
                else:
                    novo_status = StatusClinico.NAO_URGENTE

                pendentes = int(stats.get("pendentes") or 0)
                aguardando = int(stats.get("aguardando") or 0)
                validados = int(stats.get("validados") or 0)

                # Sincroniza o estado geral da requisição com o fluxo dos itens:
                # PENDENTE -> EM_ANALISE -> AGUARDANDO_VALIDACAO -> VALIDADO
                if validados == total:
                    novo_estado = ResultState.VALIDATED
                elif (validados + aguardando) == total:
                    novo_estado = ResultState.AWAITING_VALIDATION
                elif pendentes == total:
                    novo_estado = ResultState.PENDING
                else:
                    novo_estado = ResultState.IN_ANALYSIS

            resultado_finalizado = novo_estado == ResultState.VALIDATED

            if resultado.finalizado != resultado_finalizado:
                resultado.finalizado = resultado_finalizado
                resultado.save(update_fields=["finalizado"])

        update_fields = []
        if self.status_clinico != novo_status:
            self.status_clinico = novo_status
            update_fields.append("status_clinico")

        if self.possui_resultado_critico != possui_critico:
            self.possui_resultado_critico = possui_critico
            update_fields.append("possui_resultado_critico")

        if self.estado != novo_estado:
            self.estado = novo_estado
            update_fields.append("estado")

        if update_fields:
            self.save(update_fields=update_fields)

    @property
    def patient_tenant(self):
        if self.paciente:
            return getattr(self.paciente, "inquilino", None)
        return None

    _verificar_estado_terminal = _verify_terminal_state
    adicionar_exame = add_exam
    adicionar_exame_medico = add_medical_exam
    obter_resultado = get_result
    criar_resultado = create_result
    exames_medicos = medical_exams
    atualizar_status_clinico = update_clinical_status
    inquilino_do_paciente = patient_tenant

    def __str__(self):
        return f"{self.id_custom} - {self.paciente.nome}"
