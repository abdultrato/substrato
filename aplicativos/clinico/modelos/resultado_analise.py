from django.conf import settings as s
from django.db import models
from django.utils import timezone

from .nucleo import (
    ActiveStatusModel as asm,
    AuditModel as am,
    CoreModel as cm,
    SoftDeleteModel as sdm,
    TimeStampedModel as tsm,
)
from .exame_campo import ExameCampo as ec
from .mixins import CustomIDSaveMixin as cism
from .referencia_clinica import (
    IntervaloReferencia as ir,
    ReferenciaQualitativa as refq,
)

User = s.AUTH_USER_MODEL


class ResultadoItem(cm, cism, tsm, am, asm, sdm):
    """
    Resultado individual de um campo de exame.
    """

    prefixo = "RES"

    requisicao = models.ForeignKey(
        "frontend.RequisicaoAnalise",
        on_delete=models.CASCADE,
        related_name="resultados",
    )

    exame_campo = models.ForeignKey(
        ec,
        on_delete=models.CASCADE,
        related_name="resultados",
    )

    resultado = models.CharField(
        max_length=120,
        blank=True,
    )

    # ===============================
    # INTERPRETAÇÃO CLÍNICA
    # ===============================

    status_clinico = models.CharField(max_length=20, blank=True)
    cor_laudo = models.CharField(max_length=20, blank=True)

    alerta_critico = models.BooleanField(default=False)
    delta_alerta = models.BooleanField(default=False)

    tendencia = models.CharField(max_length=20, blank=True)

    interpretacao = models.TextField(blank=True)

    # ===============================
    # VALIDAÇÃO
    # ===============================

    validado = models.BooleanField(default=False)

    validado_por = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="resultados_validados",
    )

    data_validacao = models.DateTimeField(
        null=True,
        blank=True,
    )

    class Meta:
        verbose_name = "Resultado"
        verbose_name_plural = "Resultados"
        ordering = ["requisicao", "exame_campo"]
        unique_together = ("requisicao", "exame_campo")
        indexes = [
            models.Index(fields=["validado"]),
        ]

    def __str__(self):
        return f"{self.id_custom} - {self.exame_campo.nome_campo}"

    # =====================================================
    # INTERPRETAÇÃO CLÍNICA AUTOMÁTICA
    # =====================================================

    def interpretar_resultado_clinico(self):
        if not self.resultado:
            return

        exame = self.exame_campo.exame
        paciente = self.requisicao.paciente

        idade = getattr(paciente, "idade", None)
        sexo = getattr(paciente, "sexo", None)

        # histórico para delta e tendência
        anteriores = (
            ResultadoItem.objects.filter(requisicao__paciente=paciente, exame_campo=self.exame_campo)
            .exclude(pk=self.pk)
            .order_by("-criado_em")[:3]
        )

        historico = []
        for item in anteriores:
            if item.resultado and item.resultado.replace(".", "", 1).isdigit():
                historico.append(float(item.resultado))

        valor_anterior = historico[0] if historico else None

        ref_numerica = None
        ref_qualitativa = None

        if exame.tipo_resultado == "numerico":
            ref_numerica = ir(
                valor_minimo=exame.ref_min,
                valor_maximo=exame.ref_max,
                critico_baixo=exame.critico_baixo,
                critico_alto=exame.critico_alto,
                sexo=getattr(exame, "ref_sexo", None),
                idade_min=getattr(exame, "ref_idade_min", None),
                idade_max=getattr(exame, "ref_idade_max", None),
            )

        elif exame.tipo_resultado == "qualitativo":
            ref_qualitativa = refq(
                valores_normais=exame.valores_normais,
                valores_alterados=exame.valores_alterados,
                valores_criticos=exame.valores_criticos,
            )

        resultado = ir(
            valor=self.resultado,
            tipo=exame.tipo_resultado,
            idade=idade,
            sexo=sexo,
            ref_numerica=ref_numerica,
            ref_qualitativa=ref_qualitativa,
            valor_anterior=valor_anterior,
            historico=historico,
        )

        self.status_clinico = resultado["status"]
        self.cor_laudo = resultado["cor"]
        self.alerta_critico = resultado["alerta_critico"]
        self.delta_alerta = resultado["delta_alerta"]
        self.tendencia = resultado["tendencia"]
        self.interpretacao = resultado["interpretacao"]

    # =====================================================
    # SAVE OVERRIDE
    # =====================================================

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)

        # interpreta após salvar para garantir PK
        self.interpretar_resultado_clinico()

        super().save(
            update_fields=[
                "status_clinico",
                "cor_laudo",
                "alerta_critico",
                "delta_alerta",
                "tendencia",
                "interpretacao",
            ]
        )

    # =====================================================
    # VALIDAÇÃO MANUAL
    # =====================================================

    def validar(self, usuario):
        self.validado = True
        self.validado_por = usuario
        self.data_validacao = timezone.now()
        self.save(update_fields=["validado", "validado_por", "data_validacao"])
