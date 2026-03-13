from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import IntegrityError, models, transaction

from dominio.clinico.estado_resultado import EstadoResultado
from dominio.clinico.state_machine_requisicao import RequisicaoStateMachine
from nucleo.constantes.laboratorio.status_clinico import StatusClinico
from nucleo.modelos.base import NoNameCoreModel
from .exame import Exame
from .paciente import Paciente

User = settings.AUTH_USER_MODEL


class RequisicaoAnalise(NoNameCoreModel):
    prefixo = "REQ"

    class Tipo(models.TextChoices):
        LABORATORIO = "LAB", "Laboratório"
        EXAME_MEDICO = "MED", "Exame médico"

    paciente = models.ForeignKey(
        Paciente,
        on_delete=models.CASCADE,
        related_name="requisicoes",
    )

    tipo = models.CharField(
        max_length=3,
        choices=Tipo.choices,
        default=Tipo.LABORATORIO,
        db_index=True,
    )

    exames = models.ManyToManyField(
        Exame,
        through="RequisicaoItem",
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
        choices=EstadoResultado.CHOICES,
        default=EstadoResultado.PENDENTE,
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
        ordering = ["-criado_em"]
        verbose_name = "Requisição de exame"
        verbose_name_plural = "Requisições de exames"

    # =====================================================
    # INVARIANTES
    # =====================================================

    def _esta_editavel(self):
        return self.estado == EstadoResultado.PENDENTE

    def _verificar_estado_terminal(self):
        if not self.pk:
            return

        original = self.__class__.all_objects.filter(pk=self.pk).only("estado").first()

        if original and original.estado in EstadoResultado.VALIDADO:
            raise ValidationError("Requisição finalizada é imutável.")

    # =====================================================
    # SAVE CONTROLADO
    # =====================================================

    def save(self, *args, **kwargs):
        # garantir propagação de tenant
        if not self.inquilino_id and self.paciente_id:
            self.inquilino_id = self.paciente.inquilino_id

        if self.pk:
            original = (
                self.__class__.all_objects.filter(pk=self.pk)
                .only("paciente", "tipo")
                .first()
            )

            if original and original.paciente_id != self.paciente_id:
                raise ValidationError("Paciente da requisição é imutável.")

            if original and original.tipo != self.tipo:
                raise ValidationError("Tipo/setor da requisição é imutável.")

        self._verificar_estado_terminal()

        super().save(*args, **kwargs)

    # =====================================================
    # AGGREGATE ROOT
    # =====================================================

    def adicionar_exame(self, exame: Exame):
        if self.tipo != self.Tipo.LABORATORIO:
            raise ValidationError(
                "Esta requisição é de exames médicos e não aceita exames laboratoriais."
            )

        if not self._esta_editavel():
            raise ValidationError(
                "Não é possível adicionar exames após início do processamento."
            )

        from .requisicao_item import RequisicaoItem

        with transaction.atomic():
            try:
                return RequisicaoItem.all_objects.create(
                    requisicao=self,
                    exame=exame,
                )

            except IntegrityError:
                raise ValidationError("Exame já adicionado à requisição.")

    def adicionar_exame_medico(self, exame_medico):
        if self.tipo != self.Tipo.EXAME_MEDICO:
            raise ValidationError(
                "Esta requisição é laboratorial e não aceita exames médicos."
            )

        if not self._esta_editavel():
            raise ValidationError(
                "Não é possível adicionar exames após início do processamento."
            )

        from .requisicao_item import RequisicaoItem

        with transaction.atomic():
            try:
                return RequisicaoItem.all_objects.create(
                    requisicao=self,
                    exame_medico=exame_medico,
                )
            except IntegrityError:
                raise ValidationError("Exame médico já adicionado à requisição.")

    # =====================================================
    # TRANSIÇÃO DE ESTADO
    # =====================================================

    def transicionar(self, novo_estado):
        with transaction.atomic():
            requisicao = RequisicaoAnalise.all_objects.select_for_update().get(
                pk=self.pk
            )

            RequisicaoStateMachine.validar_transicao(
                requisicao.estado,
                novo_estado,
            )

            requisicao.estado = novo_estado

            requisicao.save(update_fields=["estado"])

    # =====================================================
    # RESULTADO
    # =====================================================

    def obter_resultado(self):
        from .resultado import Resultado

        return Resultado.objects.filter(requisicao=self).first()

    def criar_resultado(self):
        from .resultado import Resultado

        return Resultado.objects.create(
            requisicao=self,
            inquilino=self.inquilino,
        )

    # =====================================================
    # VIEWS/DRF HELPERS
    # =====================================================

    @property
    def exames_medicos(self):
        """
        Exames médicos associados via RequisicaoItem.

        Nota: não existe ManyToMany explícito para ExameMedico; essa propriedade
        existe para suportar serialização (API) e manter a regra de "requisição
        por setor" sem duplicar modelo.
        """
        from .exames_medicos import ExameMedico

        return (
            ExameMedico.objects.filter(requisicoes__requisicao=self, requisicoes__deletado=False)
            .distinct()
        )

    # =====================================================
    # SINCRONIZAÇÃO CLÍNICA
    # =====================================================

    def atualizar_status_clinico(self):
        if not hasattr(self, "resultado"):
            self.status_clinico = StatusClinico.NAO_URGENTE
            self.possui_resultado_critico = False

        else:
            itens = self.resultado.itens.only(
                "alerta_critico",
                "status_clinico",
                "estado",
            )

            if not itens.exists():
                self.status_clinico = StatusClinico.NAO_URGENTE
                self.possui_resultado_critico = False

            else:
                possui_critico = itens.filter(alerta_critico=True).exists()

                self.possui_resultado_critico = possui_critico

                if possui_critico:
                    self.status_clinico = StatusClinico.URGENTISSIMO

                else:
                    possui_alto = itens.filter(
                        status_clinico=StatusClinico.URGENTE
                    ).exists()

                    possui_baixo = itens.filter(
                        status_clinico=StatusClinico.MUITO_URGENTE
                    ).exists()

                    if possui_alto:
                        self.status_clinico = StatusClinico.MUITO_URGENTE

                    elif possui_baixo:
                        self.status_clinico = StatusClinico.URGENTE

                    else:
                        self.status_clinico = StatusClinico.NAO_URGENTE

        self.save(
            update_fields=[
                "status_clinico",
                "possui_resultado_critico",
            ]
        )

        self._auto_validar_se_necessario()

    # =====================================================
    # AUTO TRANSIÇÃO PARA VALIDADA
    # =====================================================

    def _auto_validar_se_necessario(self):
        if self.estado != EstadoResultado.TERMINAIS:
            return

        if not hasattr(self, "resultado"):
            return

        itens = self.resultado.itens.all()

        total = itens.count()

        if total == 0:
            return

        validados = itens.filter(estado="VALIDADO").count()

        if validados == total:
            from dominio.clinico.estado_requisicao import EstadoRequisicao

            self.transicionar(EstadoRequisicao.VALIDADA)

    # =====================================================

    @property
    def inquilino_do_paciente(self):
        if self.paciente:
            return getattr(self.paciente, "inquilino", None)
        return None

    def __str__(self):
        return f"{self.id_custom} - {self.paciente.nome}"
