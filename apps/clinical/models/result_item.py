# LOCAL: aplicativos/clinico/models/result_item.py

from decimal import Decimal, InvalidOperation

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models, transaction
from django.utils import timezone

from core.mixins.tenant_propagation import PropagarInquilinoMixin
from core.models.base import NoNameCoreModel
from domain.clinical.events import ResultValidatedEvent
from domain.clinical.result_state import ResultState
from domain.clinical.result_state_machine import ResultStateMachine
from events.bus import event_bus

from .lab_exam_field import LabExamField
from .result import Result

User = settings.AUTH_USER_MODEL


class ResultItem(PropagarInquilinoMixin, NoNameCoreModel):
    fonte_tenant = "patient"

    prefix = "RES"

    result = models.ForeignKey(

        Result,

        db_column="result_id",
        on_delete=models.CASCADE,
        related_name="itens",
    )

    exam_field = models.ForeignKey(

        LabExamField,

        db_column="exam_field_id",
        on_delete=models.CASCADE,
        related_name="resultados",
    )

    # value numérico do result
    result_value = models.DecimalField(
        db_column="result_value",
        max_digits=12, decimal_places=2, null=True, blank=True)

    clinical_status = models.CharField(

        db_column="clinical_status",

        max_length=20, blank=True)

    report_color = models.CharField(

        db_column="report_color",

        max_length=20, blank=True, null=True)

    critical_alert = models.BooleanField(

        db_column="critical_alert",

        default=False)

    status = models.CharField(

        db_column="status",

        max_length=30,
        choices=ResultState.CHOICES,
        default=ResultState.PENDING,
        db_index=True,
    )

    validated_by = models.ForeignKey(

        User,

        db_column="validated_by_id",
        on_delete=models.SET_NULL,
        verbose_name="Resultado",
        null=True,
        blank=True,
        related_name="resultados_validados",
    )

    validation_date = models.DateTimeField(

        db_column="validation_date",

        null=True, blank=True)

    class Meta:
        db_table = "clinico_resultadoitem"
        unique_together = ("result", "exam_field")

    # =====================================================
    # LAZY IMPORT
    # =====================================================

    @staticmethod
    def _result_service():
        from domain.clinical.result_service import ResultService

        return ResultService

    # =====================================================
    # SAVE CONTROLADO
    # =====================================================

    def save(self, *args, **kwargs):
        if not self.tenant and self.result:
            self.tenant = self.result.tenant

        value_anterior = None

        if self.pk:
            value_anterior = (
                self.__class__.all_objects.filter(pk=self.pk).values_list("result_value", flat=True).first()
            )

        value_alterado = value_anterior != self.result_value

        # interpretação automática
        if value_alterado and self.status != ResultState.VALIDATED:
            try:
                if self.result_value is not None:
                    self.result_value = Decimal(self.result_value)
            except (InvalidOperation, TypeError) as err:
                raise ValidationError("Valor do result inválido.") from err

            self._result_service().interpret(self)

        super().save(*args, **kwargs)

        if self.result:
            self.result.request.update_clinical_status()

    # =====================================================
    # DELETE PROTEGIDO
    # =====================================================

    def delete(self, *args, **kwargs):
        if self.status in ResultState.TERMINAL:
            raise ValidationError("Resultado validado não pode ser removido.")

        super().delete(*args, **kwargs)

    # =====================================================
    # TRANSIÇÃO DE ESTADO
    # =====================================================

    def transicionar(self, novo_status, user=None):
        with transaction.atomic():
            result = ResultItem.all_objects.select_for_update().get(pk=self.pk)

            ResultStateMachine.validate_transition(
                result.status,
                novo_status,
            )

            if novo_status == ResultState.VALIDATED:
                if result.result_value is None:
                    raise ValidationError("Não é possível validar result vazio.")

                result.validated_by = user
                result.validation_date = timezone.now()

                self._result_service().interpret(result)

            result.status = novo_status

            result.save(
                update_fields=[
                    "status",
                    "validated_by",
                    "validation_date",
                    "clinical_status",
                    "report_color",
                    "critical_alert",
                    "result_value",
                ]
            )

        if novo_status == ResultState.VALIDATED:
            event_bus.publish_after_commit(ResultValidatedEvent(result_id=self.id))

    def __str__(self):
        return f"{self.custom_id} - {self.exam_field.name}"

    # =====================================================
    # RESULTADO FORMATADO
    # =====================================================

    @property
    def formatted_result_value(self):
        """
        Retorna o value do result acompanhado do símbolo clínico.

        Exemplos:
        6.2 ↓↓
        14.1 ↑
        4.5
        """

        if self.result_value is None:
            return "-"

        simbolo = self.clinical_status or ""

        if simbolo and simbolo != "N":
            return f"{self.result_value} {simbolo}"

        return str(self.result_value)

    _servico_result = _result_service
    result_value_formatado = formatted_result_value
