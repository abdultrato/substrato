from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import IntegrityError, models, transaction

from dominio.clinico.estado_resultado import EstadoResultado
from dominio.clinico.state_machine_resultado import ResultadoStateMachine
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

    empresa_solicitante = models.ForeignKey(
        "entidades.Empresa",
        verbose_name="Empresa solicitante",
        help_text="Empresa que subcontrata os serviços (ex.: medicina ocupacional).",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="requisicoes_solicitadas",
    )

    empresa_executora_externa = models.ForeignKey(
        "entidades.Empresa",
        verbose_name="Empresa executora externa",
        help_text="Quando a clínica terceiriza a execução para outra empresa.",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="requisicoes_terceirizadas",
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

        if original and original.estado in EstadoResultado.TERMINAIS:
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

            ResultadoStateMachine.validar_transicao(
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
        # Não recalcula nem altera requisição já finalizada (imutável).
        if self.estado in EstadoResultado.TERMINAIS:
            try:
                if hasattr(self, "resultado") and not self.resultado.finalizado:
                    self.resultado.finalizado = True
                    self.resultado.save(update_fields=["finalizado"])
            except Exception:
                pass
            return

        novo_status = StatusClinico.NAO_URGENTE
        possui_critico = False
        novo_estado = EstadoResultado.PENDENTE
        resultado_finalizado = False

        if hasattr(self, "resultado"):
            resultado = self.resultado
            itens = resultado.itens.all()

            stats = itens.aggregate(
                total=models.Count("id"),
                criticos=models.Count("id", filter=models.Q(alerta_critico=True)),
                urgentes=models.Count("id", filter=models.Q(status_clinico=StatusClinico.URGENTE)),
                muito_urgentes=models.Count("id", filter=models.Q(status_clinico=StatusClinico.MUITO_URGENTE)),
                pendentes=models.Count("id", filter=models.Q(estado=EstadoResultado.PENDENTE)),
                aguardando=models.Count("id", filter=models.Q(estado=EstadoResultado.AGUARDANDO_VALIDACAO)),
                validados=models.Count("id", filter=models.Q(estado=EstadoResultado.VALIDADO)),
            )

            total = int(stats.get("total") or 0)
            criticos = int(stats.get("criticos") or 0)
            urgentes = int(stats.get("urgentes") or 0)
            muito_urgentes = int(stats.get("muito_urgentes") or 0)

            possui_critico = criticos > 0

            if total == 0:
                novo_status = StatusClinico.NAO_URGENTE
                novo_estado = EstadoResultado.PENDENTE
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
                    novo_estado = EstadoResultado.VALIDADO
                elif (validados + aguardando) == total:
                    novo_estado = EstadoResultado.AGUARDANDO_VALIDACAO
                elif pendentes == total:
                    novo_estado = EstadoResultado.PENDENTE
                else:
                    novo_estado = EstadoResultado.EM_ANALISE

            resultado_finalizado = novo_estado == EstadoResultado.VALIDADO

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
    def inquilino_do_paciente(self):
        if self.paciente:
            return getattr(self.paciente, "inquilino", None)
        return None

    def __str__(self):
        return f"{self.id_custom} - {self.paciente.nome}"
