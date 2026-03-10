from decimal import Decimal

from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import DecimalField, F, Sum
from django.db.models.functions import Coalesce

from aplicativos.clinico.modelos.paciente import Paciente
from aplicativos.clinico.modelos.requisicao_analise import RequisicaoAnalise
from nucleo.modelos.base import NoNameCoreModel


class Fatura(NoNameCoreModel):
    prefixo = "FAT"

    class Estado(models.TextChoices):
        RASCUNHO = "RASC", "Rascunho"
        EMITIDA = "EMIT", "Emitida"
        PAGA = "PAGA", "Paga"
        CANCELADA = "CANC", "Cancelada"

    class Origem(models.TextChoices):
        CLINICO = "CLI", "Clínico"
        FARMACIA = "FAR", "Farmácia"
        ENFERMAGEM = "ENF", "Enfermagem"

    origem = models.CharField(
        max_length=3,
        choices=Origem.choices,
        default=Origem.CLINICO,
        db_index=True,
    )

    requisicao = models.OneToOneField(
        RequisicaoAnalise,
        on_delete=models.CASCADE,
        related_name="fatura",
        null=True,
        blank=True,
    )
    venda = models.OneToOneField(
        "farmacia.Venda",
        on_delete=models.PROTECT,
        related_name="fatura",
        null=True,
        blank=True,
    )
    procedimento = models.OneToOneField(
        "enfermagem.Procedimento",
        on_delete=models.PROTECT,
        related_name="fatura",
        null=True,
        blank=True,
    )

    paciente = models.ForeignKey(
        Paciente,
        on_delete=models.PROTECT,
        related_name="faturas",
        null=True,
        blank=True,
    )

    subtotal = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    iva_valor = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    valor_seguro = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    valor_paciente = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    estado = models.CharField(
        max_length=5,
        choices=Estado.choices,
        default=Estado.RASCUNHO,
        db_index=True,
    )

    # ==========================================
    # RECÁLCULO FINANCEIRO
    # ==========================================

    def recalcular_totais(self):
        subtotal = self.itens.aggregate(
            total=Coalesce(
                Sum(
                    F("quantidade") * F("preco_unitario"),
                    output_field=DecimalField(max_digits=12, decimal_places=2),
                ),
                Decimal("0.00"),
            )
        )["total"]

        iva = subtotal * Decimal("0.16")
        total = subtotal + iva

        self.subtotal = subtotal
        self.iva_valor = iva
        self.total = total
        self.valor_paciente = total - (self.valor_seguro or Decimal("0.00"))

    def persistir_totais(self):
        self.recalcular_totais()
        if not self.pk:
            return
        self.__class__.all_objects.filter(pk=self.pk).update(
            subtotal=self.subtotal,
            iva_valor=self.iva_valor,
            total=self.total,
            valor_paciente=self.valor_paciente,
        )

    def valor_pago_confirmado(self):
        from aplicativos.pagamentos.modelos.pagamentos import Pagamento

        return self.pagamentos.filter(
            status=Pagamento.Status.CONFIRMADO,
            deletado=False,
        ).aggregate(
            total=Coalesce(
                Sum(
                    "valor",
                    output_field=DecimalField(max_digits=12, decimal_places=2),
                ),
                Decimal("0.00"),
            )
        )["total"]

    def _numero_recibo_padrao(self, pagamento):
        referencia = pagamento.id_custom or pagamento.pk
        return f"REC-{referencia}"

    def gerar_recibo_automatico(self, pagamento):
        if not pagamento or pagamento.status != pagamento.Status.CONFIRMADO:
            return None

        from aplicativos.pagamentos.modelos.recibo import Recibo

        recibo = Recibo.objects.filter(pagamento=pagamento).order_by("id").first()

        if recibo:
            campos_atualizar = []
            if recibo.fatura_id != self.pk:
                recibo.fatura = self
                campos_atualizar.append("fatura")
            if recibo.valor != pagamento.valor:
                recibo.valor = pagamento.valor
                campos_atualizar.append("valor")

            if campos_atualizar:
                recibo.save(update_fields=campos_atualizar)

            return recibo

        return Recibo.objects.create(
            fatura=self,
            pagamento=pagamento,
            numero=self._numero_recibo_padrao(pagamento),
            valor=pagamento.valor,
        )

    def atualizar_estado_pagamento(self, pagamento=None):
        if self.estado in {self.Estado.RASCUNHO, self.Estado.CANCELADA}:
            return

        total_pago = self.valor_pago_confirmado() or Decimal("0.00")
        total_fatura = self.total or Decimal("0.00")
        novo_estado = (
            self.Estado.PAGA
            if total_pago >= total_fatura and total_fatura > Decimal("0.00")
            else self.Estado.EMITIDA
        )

        if novo_estado == self.Estado.PAGA and pagamento is not None:
            self.gerar_recibo_automatico(pagamento)

        if self.estado != novo_estado:
            self.estado = novo_estado
            self.save(update_fields=["estado"])

    # ==========================================
    # ORIGEM
    # ==========================================

    @property
    def referencia_origem(self):
        if self.origem == self.Origem.CLINICO:
            return self.requisicao
        if self.origem == self.Origem.FARMACIA:
            return self.venda
        if self.origem == self.Origem.ENFERMAGEM:
            return self.procedimento
        return None

    def _validar_origem(self):
        campos_origem = {
            self.Origem.CLINICO: "requisicao",
            self.Origem.FARMACIA: "venda",
            self.Origem.ENFERMAGEM: "procedimento",
        }
        campo_esperado = campos_origem[self.origem]

        vinculados = {
            "requisicao": bool(self.requisicao_id),
            "venda": bool(self.venda_id),
            "procedimento": bool(self.procedimento_id),
        }
        if sum(vinculados.values()) != 1:
            raise ValidationError(
                "A fatura deve possuir exatamente uma referência de origem."
            )

        if not vinculados[campo_esperado]:
            raise ValidationError(
                {campo_esperado: "Informe a referência compatível com a origem."}
            )

        for campo, informado in vinculados.items():
            if campo != campo_esperado and informado:
                raise ValidationError(
                    {campo: "Remova esta referência, ela não corresponde à origem."}
                )

        if self.origem == self.Origem.CLINICO and self.requisicao_id:
            self.paciente = self.requisicao.paciente
            if self.requisicao.inquilino_id != self.inquilino_id:
                raise ValidationError(
                    {"requisicao": "Requisição e fatura devem pertencer ao mesmo inquilino."}
                )

        if self.origem == self.Origem.ENFERMAGEM and self.procedimento_id:
            self.paciente = self.procedimento.paciente
            if self.procedimento.inquilino_id != self.inquilino_id:
                raise ValidationError(
                    {
                        "procedimento": (
                            "Procedimento e fatura devem pertencer ao mesmo inquilino."
                        )
                    }
                )

        if self.origem == self.Origem.FARMACIA and self.venda_id:
            if self.venda.inquilino_id != self.inquilino_id:
                raise ValidationError(
                    {"venda": "Venda e fatura devem pertencer ao mesmo inquilino."}
                )

        if self.paciente_id and self.paciente.inquilino_id != self.inquilino_id:
            raise ValidationError(
                {"paciente": "Paciente e fatura devem pertencer ao mesmo inquilino."}
            )

    def sincronizar_itens_da_origem(self):
        if self.estado != self.Estado.RASCUNHO:
            raise ValidationError("Somente faturas em rascunho podem sincronizar itens.")

        from aplicativos.faturamento.modelos.fatura_itens import FaturaItem

        for item in self.itens.filter(deletado=False):
            item.delete()

        if self.origem == self.Origem.CLINICO:
            itens_requisicao = self.requisicao.itens.select_related("exame")
            for item in itens_requisicao:
                FaturaItem.objects.create(
                    inquilino=self.inquilino,
                    fatura=self,
                    tipo_item=FaturaItem.TipoItem.EXAME,
                    exame=item.exame,
                )

        elif self.origem == self.Origem.FARMACIA:
            itens_venda = self.venda.itens.select_related("produto")
            for item in itens_venda:
                FaturaItem.objects.create(
                    inquilino=self.inquilino,
                    fatura=self,
                    tipo_item=FaturaItem.TipoItem.ITEM_VENDA,
                    item_venda=item,
                )

        elif self.origem == self.Origem.ENFERMAGEM:
            itens_procedimento = self.procedimento.itens.filter(realizado=True)
            for item in itens_procedimento:
                FaturaItem.objects.create(
                    inquilino=self.inquilino,
                    fatura=self,
                    tipo_item=FaturaItem.TipoItem.PROCEDIMENTO_ITEM,
                    procedimento_item=item,
                )

            materiais_procedimento = self.procedimento.materiais.all()
            for material in materiais_procedimento:
                FaturaItem.objects.create(
                    inquilino=self.inquilino,
                    fatura=self,
                    tipo_item=FaturaItem.TipoItem.PROCEDIMENTO_MATERIAL,
                    procedimento_material=material,
                )

        self.persistir_totais()

    # ==========================================
    # EMISSÃO
    # ==========================================

    def emitir(self):
        if self.estado != self.Estado.RASCUNHO:
            raise ValidationError("Somente faturas em rascunho podem ser emitidas.")

        if not self.itens.filter(deletado=False).exists():
            raise ValidationError("Fatura sem itens.")

        self.persistir_totais()
        self.estado = self.Estado.EMITIDA
        self.save(update_fields=["estado", "subtotal", "iva_valor", "total", "valor_paciente"])

    # ==========================================
    # BLOQUEIO DE ALTERAÇÃO
    # ==========================================

    def clean(self):
        super().clean()

        self._validar_origem()

        if self.pk:
            original = Fatura.all_objects.get(pk=self.pk)
            if original.estado != self.Estado.RASCUNHO:
                raise ValidationError("Fatura já emitida não pode ser alterada.")

    def __str__(self):
        if self.paciente_id:
            return f"{self.id_custom} - {self.paciente.nome}"
        return f"{self.id_custom}"
