# LOCAL: aplicativos/clinico/modelos/resultado_item.py

from decimal import Decimal, InvalidOperation

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models, transaction
from django.utils import timezone

from dominio.clinico.estado_resultado import EstadoResultado
from dominio.clinico.eventos import ResultadoValidadoEvent
from dominio.clinico.state_machine_resultado import ResultadoStateMachine
from eventos.bus import event_bus
from nucleo.mixins.tenant_propagation import PropagarInquilinoMixin
from nucleo.modelos.base import NoNameCoreModel

from .exame_campo import ExameCampo
from .resultado import Resultado

User = settings.AUTH_USER_MODEL


class ResultadoItem(PropagarInquilinoMixin, NoNameCoreModel):
    fonte_inquilino = "paciente"

    prefixo = "RES"

    resultado = models.ForeignKey(
        Resultado,
        on_delete=models.CASCADE,
        related_name="itens",
    )

    exame_campo = models.ForeignKey(
        ExameCampo,
        on_delete=models.CASCADE,
        related_name="resultados",
    )

    # valor numérico do resultado
    resultado_valor = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)

    status_clinico = models.CharField(max_length=20, blank=True)

    cor_laudo = models.CharField(max_length=20, blank=True, null=True)

    alerta_critico = models.BooleanField(default=False)

    estado = models.CharField(
        max_length=30,
        choices=EstadoResultado.CHOICES,
        default=EstadoResultado.PENDENTE,
        db_index=True,
    )

    validado_por = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        verbose_name="Resultado",
        null=True,
        blank=True,
        related_name="resultados_validados",
    )

    data_validacao = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = ("resultado", "exame_campo")

    # =====================================================
    # LAZY IMPORT
    # =====================================================

    @staticmethod
    def _servico_resultado():
        from dominio.clinico.servico_resultado import ServicoResultado

        return ServicoResultado

    # =====================================================
    # SAVE CONTROLADO
    # =====================================================

    def save(self, *args, **kwargs):
        if not self.inquilino and self.resultado:
            self.inquilino = self.resultado.inquilino

        valor_anterior = None

        if self.pk:
            valor_anterior = (
                self.__class__.all_objects.filter(pk=self.pk).values_list("resultado_valor", flat=True).first()
            )

        valor_alterado = valor_anterior != self.resultado_valor

        # interpretação automática
        if valor_alterado and self.estado != EstadoResultado.VALIDADO:
            try:
                if self.resultado_valor is not None:
                    self.resultado_valor = Decimal(self.resultado_valor)
            except (InvalidOperation, TypeError) as err:
                raise ValidationError("Valor do resultado inválido.") from err

            self._servico_resultado().interpretar(self)

        super().save(*args, **kwargs)

        if self.resultado:
            self.resultado.requisicao.atualizar_status_clinico()

    # =====================================================
    # DELETE PROTEGIDO
    # =====================================================

    def delete(self, *args, **kwargs):
        if self.estado in EstadoResultado.TERMINAIS:
            raise ValidationError("Resultado validado não pode ser removido.")

        super().delete(*args, **kwargs)

    # =====================================================
    # TRANSIÇÃO DE ESTADO
    # =====================================================

    def transicionar(self, novo_estado, usuario=None):
        with transaction.atomic():
            resultado = ResultadoItem.all_objects.select_for_update().get(pk=self.pk)

            ResultadoStateMachine.validar_transicao(
                resultado.estado,
                novo_estado,
            )

            if novo_estado == EstadoResultado.VALIDADO:
                if resultado.resultado_valor is None:
                    raise ValidationError("Não é possível validar resultado vazio.")

                resultado.validado_por = usuario
                resultado.data_validacao = timezone.now()

                self._servico_resultado().interpretar(resultado)

            resultado.estado = novo_estado

            resultado.save(
                update_fields=[
                    "estado",
                    "validado_por",
                    "data_validacao",
                    "status_clinico",
                    "cor_laudo",
                    "alerta_critico",
                    "resultado_valor",
                ]
            )

        if novo_estado == EstadoResultado.VALIDADO:
            event_bus.publish_after_commit(ResultadoValidadoEvent(resultado_id=self.id))

    def __str__(self):
        return f"{self.id_custom} - {self.exame_campo.nome}"

    # =====================================================
    # RESULTADO FORMATADO
    # =====================================================

    @property
    def resultado_valor_formatado(self):
        """
        Retorna o valor do resultado acompanhado do símbolo clínico.

        Exemplos:
        6.2 ↓↓
        14.1 ↑
        4.5
        """

        if self.resultado_valor is None:
            return "-"

        simbolo = self.status_clinico or ""

        if simbolo and simbolo != "N":
            return f"{self.resultado_valor} {simbolo}"

        return str(self.resultado_valor)
