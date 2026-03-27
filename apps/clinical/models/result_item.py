# LOCAL: aplicativos/clinico/models/result_item.py

from decimal import Decimal, InvalidOperation

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models, transaction
from django.utils import timezone

from core.mixins.tenant_propagation import TenantPropagationMixin
from core.models.base import NoNameCoreModel
from domain.clinical.events import ResultValidatedEvent
from domain.clinical.result_state import ResultState
from domain.clinical.result_state_machine import ResultStateMachine
from events.bus import event_bus

from .lab_exam_field import LabExamField
from .result import Result

User = settings.AUTH_USER_MODEL


class ResultItem(TenantPropagationMixin, NoNameCoreModel):
    tenant_source = "user"

    prefix = "RES"

    result = models.ForeignKey(

        Result,

        db_column="result_id",
        on_delete=models.CASCADE,
        related_name="items",
        verbose_name="Resultado",
    )

    exam_field = models.ForeignKey(

        LabExamField,

        db_column="exam_field_id",
        on_delete=models.CASCADE,
        related_name="results", 
        verbose_name="Campo do exame",
    )

    # value numérico do result
    result_value = models.DecimalField(
        db_column="result_value",
        verbose_name="Valor do resultado",
        max_digits=12, decimal_places=2, 
        null=True, blank=True)

    clinical_status = models.CharField(
        verbose_name="Status clínico",
        db_column="clinical_status",

        max_length=20, blank=True)

    report_color = models.CharField(
        verbose_name="Cor para relatório",

        db_column="report_color",

        max_length=20, blank=True, null=True)

    critical_alert = models.BooleanField(
        verbose_name="Alerta crítico",

        db_column="critical_alert",

        default=False)

    status = models.CharField(
        verbose_name="Status do resultado",

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
        verbose_name="Validado por",
        null=True,
        blank=True,
        related_name="validated_results",
    )

    # Usuário que registrou/editou o item (para propagação de tenant).
    user = models.ForeignKey(
        User,
        db_column="user_id",
        on_delete=models.SET_NULL,
        verbose_name="Usuário",
        null=True,
        blank=True,
        related_name="result_items",
    )

    validation_date = models.DateTimeField(
        verbose_name="Data de validação",

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
        if not self.tenant:
            if self.user and getattr(self.user, "tenant_id", None):
                self.tenant = self.user.tenant
            elif self.result:
                self.tenant = self.result.tenant

        previous_value = None

        if self.pk:
            previous_value = (
                self.__class__.all_objects.filter(pk=self.pk).values_list("result_value", flat=True).first()
            )

        value_changed = previous_value != self.result_value

        # interpretação automática
        if value_changed and self.status != ResultState.VALIDATED:
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

    def transition(self, new_status, user=None):
        with transaction.atomic():
            result = ResultItem.all_objects.select_for_update().get(pk=self.pk)

            ResultStateMachine.validate_transition(
                result.status,
                new_status,
            )

            if new_status == ResultState.VALIDATED:
                if result.result_value is None:
                    raise ValidationError("Não é possível validar result vazio.")

                result.validated_by = user
                result.validation_date = timezone.now()

                self._result_service().interpret(result)

            result.status = new_status

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

        if new_status == ResultState.VALIDATED:
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

        symbol = self.clinical_status or ""

        if symbol and symbol != "N":
            return f"{self.result_value} {symbol}"

        return str(self.result_value)
