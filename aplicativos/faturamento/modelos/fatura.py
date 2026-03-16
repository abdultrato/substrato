from decimal import Decimal

from django.core.exceptions import ValidationError
from django.db import models, transaction
from django.db.models import DecimalField, F, Sum, Value
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
        CONSULTA = "CON", "Consulta"

    origem = models.CharField(
        verbose_name="Origem",
        max_length=3,
        choices=Origem.choices,
        default=Origem.CLINICO,
        db_index=True,
    )

    requisicao = models.OneToOneField(
        RequisicaoAnalise,
        verbose_name="Requisição",
        on_delete=models.CASCADE,
        related_name="fatura",
        null=True,
        blank=True,
    )
    venda = models.OneToOneField(
        "farmacia.Venda",
        verbose_name="Venda",
        on_delete=models.PROTECT,
        related_name="fatura",
        null=True,
        blank=True,
    )
    procedimento = models.OneToOneField(
        "enfermagem.Procedimento",
        verbose_name="Procedimento (legado)",
        on_delete=models.PROTECT,
        related_name="fatura",
        null=True,
        blank=True,
        help_text="Legado: prefira usar o campo 'procedimentos' (múltiplos).",
    )
    procedimentos = models.ManyToManyField(
        "enfermagem.Procedimento",
        verbose_name="Procedimentos (Enfermagem)",
        blank=True,
        related_name="faturas",
        help_text="Pode associar múltiplos procedimentos de enfermagem à mesma fatura.",
    )
    consulta = models.OneToOneField(
        "consultas.ConsultaMedica",
        verbose_name="Consulta",
        on_delete=models.PROTECT,
        related_name="fatura",
        null=True,
        blank=True,
    )

    paciente = models.ForeignKey(
        Paciente,
        verbose_name="Paciente",
        on_delete=models.PROTECT,
        related_name="faturas",
        null=True,
        blank=True,
    )

    subtotal = models.DecimalField(verbose_name="Total sem IVA", max_digits=12, decimal_places=2, default=0)
    iva_valor = models.DecimalField(verbose_name="Total de IVA", max_digits=12, decimal_places=2, default=0)
    total = models.DecimalField(verbose_name="Total com IVA", max_digits=12, decimal_places=2, default=0)

    valor_seguro = models.DecimalField(verbose_name="Valor do seguro", max_digits=12, decimal_places=2, default=0)
    valor_paciente = models.DecimalField(verbose_name="Valor do paciente", max_digits=12, decimal_places=2, default=0)

    estado = models.CharField(
        verbose_name="Estado",
        max_length=5,
        choices=Estado.choices,
        default=Estado.RASCUNHO,
        db_index=True,
    )

    class Meta:
        verbose_name = "Fatura"
        verbose_name_plural = "Faturas"
        ordering = ["-criado_em"]
        indexes = [
            models.Index(fields=["inquilino", "origem", "estado", "criado_em"]),
            models.Index(fields=["inquilino", "paciente", "criado_em"]),
        ]

    # ==========================================
    # RECÁLCULO FINANCEIRO
    # ==========================================

    def registrar_historico(self, tipo_evento: str, titulo: str, linhas: list[str] | None = None) -> None:
        """
        Registra histórico textual com formatação linha-a-linha.
        """
        from aplicativos.faturamento.modelos.historico_fatura import HistoricoFatura

        parts: list[str] = [titulo]
        if linhas:
            for linha in linhas:
                texto = str(linha).strip()
                if texto:
                    parts.append(texto)

        HistoricoFatura.objects.create(
            inquilino=self.inquilino,
            nome=titulo,
            fatura=self,
            descricao="\n".join(parts).strip(),
            tipo_evento=tipo_evento,
        )

    def recalcular_totais(self):
        linha_expr = F("quantidade") * F("preco_unitario")
        subtotal = self.itens.aggregate(
            total=Coalesce(
                Sum(
                    linha_expr,
                    output_field=DecimalField(max_digits=12, decimal_places=2),
                ),
                Decimal("0.00"),
            )
        )["total"]

        iva_expr = linha_expr * Coalesce(F("iva_percentual"), Value(Decimal("0.00"))) / Value(Decimal("100.00"))
        iva = self.itens.aggregate(
            total=Coalesce(
                Sum(
                    iva_expr,
                    output_field=DecimalField(max_digits=12, decimal_places=2),
                ),
                Decimal("0.00"),
            )
        )["total"]

        total = (subtotal or Decimal("0.00")) + (iva or Decimal("0.00"))

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
        # Um recibo é gerado quando a fatura fica totalmente paga. O número
        # precisa ser estável e rastreável pela fatura (não pelo pagamento
        # parcial), mas mantemos referência do pagamento que fechou a fatura.
        fat_ref = self.id_custom or self.pk
        pag_ref = getattr(pagamento, "id_custom", None) or getattr(pagamento, "pk", None)
        if pag_ref:
            return f"REC-{fat_ref}-{pag_ref}"
        return f"REC-{fat_ref}"

    def gerar_recibo_automatico(self, pagamento):
        if not pagamento or pagamento.status != pagamento.Status.CONFIRMADO:
            return None

        from aplicativos.pagamentos.modelos.recibo import Recibo

        # Garante 1 recibo por fatura (mesmo que existam pagamentos parciais).
        # Se já existir, apenas sincroniza o pagamento de referência + valor.
        recibo = (
            Recibo.objects.filter(fatura=self).order_by("-criado_em", "-id").first()
            or Recibo.objects.filter(pagamento=pagamento).order_by("-criado_em", "-id").first()
        )

        if recibo:
            campos_atualizar = []
            if recibo.fatura_id != self.pk:
                recibo.fatura = self
                campos_atualizar.append("fatura")
            if recibo.valor != self.total:
                # O recibo representa o pagamento total da fatura (não apenas
                # o último pagamento).
                recibo.valor = self.total
                campos_atualizar.append("valor")
            if recibo.pagamento_id != pagamento.pk:
                recibo.pagamento = pagamento
                campos_atualizar.append("pagamento")

            numero = self._numero_recibo_padrao(pagamento)
            if recibo.numero != numero:
                recibo.numero = numero
                campos_atualizar.append("numero")

            if campos_atualizar:
                recibo.save(update_fields=campos_atualizar)

            return recibo

        return Recibo.objects.create(
            fatura=self,
            pagamento=pagamento,
            numero=self._numero_recibo_padrao(pagamento),
            valor=self.total,
        )

    def atualizar_estado_pagamento(self, pagamento=None):
        if self.estado in {self.Estado.RASCUNHO, self.Estado.CANCELADA}:
            return

        total_pago = self.valor_pago_confirmado() or Decimal("0.00")
        total_fatura = self.total or Decimal("0.00")
        novo_estado = (
            self.Estado.PAGA if total_pago >= total_fatura and total_fatura > Decimal("0.00") else self.Estado.EMITIDA
        )

        if novo_estado == self.Estado.PAGA and pagamento is not None:
            self.gerar_recibo_automatico(pagamento)

        if self.estado != novo_estado:
            self.estado = novo_estado
            self.save(update_fields=["estado"])
            try:
                linhas = [
                    f"Novo estado: {self.get_estado_display()}",
                    f"Total com IVA: {self.total:.2f}",
                    f"Total pago confirmado: {(total_pago or Decimal('0.00')):.2f}",
                ]
                self.registrar_historico("PAGAMENTO", "Estado de pagamento atualizado", linhas=linhas)
            except Exception:
                pass

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
            if self.pk and self.procedimentos.exists():
                return f"{self.procedimentos.count()} procedimento(s)"
            return self.procedimento
        if self.origem == self.Origem.CONSULTA:
            return self.consulta
        return None

    def _validar_origem(self):
        if self.origem == self.Origem.ENFERMAGEM:
            # Enfermagem: pode usar legado (procedimento) OU múltiplos (procedimentos).
            if self.procedimento_id and self.pk and self.procedimentos.exists():
                raise ValidationError(
                    {"procedimentos": ("Use apenas um: 'procedimento (legado)' OU 'procedimentos (múltiplos)'.")}
                )

            if self.requisicao_id:
                raise ValidationError({"requisicao": "Remova a requisição, não corresponde à origem Enfermagem."})
            if self.venda_id:
                raise ValidationError({"venda": "Remova a venda, não corresponde à origem Enfermagem."})
            if self.consulta_id:
                raise ValidationError({"consulta": "Remova a consulta, não corresponde à origem Enfermagem."})

            if self.procedimento_id:
                self.paciente = self.procedimento.paciente
                if self.inquilino_id and self.procedimento.inquilino_id != self.inquilino_id:
                    raise ValidationError({"procedimento": "Procedimento e fatura devem pertencer ao mesmo inquilino."})
            elif self.pk:
                procs = list(self.procedimentos.select_related("paciente").all())
                if not procs:
                    raise ValidationError({"procedimentos": "Informe ao menos um procedimento."})
                paciente_id = procs[0].paciente_id
                inquilino_id = procs[0].inquilino_id
                for p in procs:
                    if p.inquilino_id != inquilino_id:
                        raise ValidationError(
                            {"procedimentos": "Todos os procedimentos devem pertencer ao mesmo inquilino."}
                        )
                    if p.paciente_id != paciente_id:
                        raise ValidationError({"procedimentos": "Todos os procedimentos devem ser do mesmo paciente."})
                if self.inquilino_id and inquilino_id != self.inquilino_id:
                    raise ValidationError(
                        {"procedimentos": "Procedimentos e fatura devem pertencer ao mesmo inquilino."}
                    )
                self.paciente = procs[0].paciente

        else:
            # Demais origens (mantém regra: exatamente uma referência)
            campos_origem = {
                self.Origem.CLINICO: "requisicao",
                self.Origem.FARMACIA: "venda",
                self.Origem.ENFERMAGEM: "procedimento",
                self.Origem.CONSULTA: "consulta",
            }
            campo_esperado = campos_origem[self.origem]

            vinculados = {
                "requisicao": bool(self.requisicao_id),
                "venda": bool(self.venda_id),
                "procedimento": bool(self.procedimento_id),
                "consulta": bool(self.consulta_id),
            }
            if sum(vinculados.values()) != 1:
                raise ValidationError("A fatura deve possuir exatamente uma referência de origem.")

            if not vinculados[campo_esperado]:
                raise ValidationError({campo_esperado: "Informe a referência compatível com a origem."})

            for campo, informado in vinculados.items():
                if campo != campo_esperado and informado:
                    raise ValidationError({campo: "Remova esta referência, ela não corresponde à origem."})

            if self.pk and self.procedimentos.exists():
                raise ValidationError(
                    {"procedimentos": "Remova os procedimentos, não correspondem à origem selecionada."}
                )

            if self.origem == self.Origem.CLINICO and self.requisicao_id:
                self.paciente = self.requisicao.paciente
                if self.requisicao.inquilino_id != self.inquilino_id:
                    raise ValidationError({"requisicao": "Requisição e fatura devem pertencer ao mesmo inquilino."})

            if self.origem == self.Origem.FARMACIA and self.venda_id:
                if getattr(self.venda, "paciente_id", None):
                    self.paciente = self.venda.paciente
                if self.venda.inquilino_id != self.inquilino_id:
                    raise ValidationError({"venda": "Venda e fatura devem pertencer ao mesmo inquilino."})

            if self.origem == self.Origem.CONSULTA and self.consulta_id:
                self.paciente = self.consulta.paciente
                if self.consulta.inquilino_id != self.inquilino_id:
                    raise ValidationError({"consulta": "Consulta e fatura devem pertencer ao mesmo inquilino."})

        if self.paciente_id and self.paciente.inquilino_id != self.inquilino_id:
            raise ValidationError({"paciente": "Paciente e fatura devem pertencer ao mesmo inquilino."})

    def sincronizar_itens_da_origem(self):
        if self.estado != self.Estado.RASCUNHO:
            raise ValidationError("Somente faturas em rascunho podem sincronizar itens.")

        from aplicativos.faturamento.modelos.fatura_itens import FaturaItem

        for item in self.itens.filter(deletado=False):
            item.delete()

        if self.origem == self.Origem.CLINICO:
            itens_requisicao = self.requisicao.itens.select_related(
                "exame",
                "exame_medico",
            )
            for item in itens_requisicao:
                if item.exame_id:
                    FaturaItem.objects.create(
                        inquilino=self.inquilino,
                        fatura=self,
                        tipo_item=FaturaItem.TipoItem.EXAME,
                        exame=item.exame,
                    )

                elif item.exame_medico_id:
                    FaturaItem.objects.create(
                        inquilino=self.inquilino,
                        fatura=self,
                        tipo_item=FaturaItem.TipoItem.EXAME_MEDICO,
                        exame_medico=item.exame_medico,
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
            procedimentos = []
            if self.procedimento_id:
                procedimentos = [self.procedimento]
            elif self.pk:
                procedimentos = list(self.procedimentos.all())

            if not procedimentos:
                raise ValidationError(
                    {"procedimentos": "Informe ao menos um procedimento de enfermagem para sincronizar itens."}
                )

            for proc in procedimentos:
                itens_procedimento = proc.itens.filter(realizado=True)
                for item in itens_procedimento:
                    FaturaItem.objects.create(
                        inquilino=self.inquilino,
                        fatura=self,
                        tipo_item=FaturaItem.TipoItem.PROCEDIMENTO_ITEM,
                        procedimento_item=item,
                    )

                materiais_procedimento = proc.materiais.all()
                for material in materiais_procedimento:
                    FaturaItem.objects.create(
                        inquilino=self.inquilino,
                        fatura=self,
                        tipo_item=FaturaItem.TipoItem.PROCEDIMENTO_MATERIAL,
                        procedimento_material=material,
                    )

        elif self.origem == self.Origem.CONSULTA:
            descricao = f"Consulta: {getattr(self.consulta, 'tipo', '')}".strip()
            if not descricao:
                descricao = "Consulta"
            FaturaItem.objects.create(
                inquilino=self.inquilino,
                fatura=self,
                tipo_item=FaturaItem.TipoItem.AJUSTE,
                descricao=descricao,
                quantidade=Decimal("1.00"),
                preco_unitario=getattr(self.consulta, "preco", Decimal("0.00")) or Decimal("0.00"),
            )

        self.persistir_totais()
        try:
            linhas = [
                f"Origem: {self.get_origem_display()}",
                f"Paciente: {getattr(self.paciente, 'nome', '-')}",
                f"Itens: {self.itens.filter(deletado=False).count()}",
                f"Total sem IVA: {self.subtotal:.2f}",
                f"IVA: {self.iva_valor:.2f}",
                f"Total com IVA: {self.total:.2f}",
            ]
            self.registrar_historico("SINCRONIZACAO", "Itens sincronizados", linhas=linhas)
        except Exception:
            pass

    # ==========================================
    # EMISSÃO
    # ==========================================

    @transaction.atomic
    def emitir(self):
        if self.estado != self.Estado.RASCUNHO:
            raise ValidationError("Somente faturas em rascunho podem ser emitidas.")

        if not self.itens.filter(deletado=False).exists():
            raise ValidationError("Fatura sem itens.")

        if self.origem == self.Origem.ENFERMAGEM:
            from aplicativos.farmacia.models.lote import Lote

            procedimentos = []
            if self.procedimento_id:
                procedimentos = [self.procedimento]
            elif self.pk:
                procedimentos = list(self.procedimentos.all())

            pendentes = []
            for proc in procedimentos:
                pendentes.extend(
                    list(proc.materiais.filter(movimento_estoque__isnull=True).select_related("produto").all())
                )

            faltas = []
            for material in pendentes:
                # Regra atual: cada consumo precisa caber em um lote válido.
                lotes = Lote.disponiveis(material.produto)
                if self.inquilino_id:
                    lotes = lotes.filter(inquilino_id=self.inquilino_id)

                best = lotes.order_by("-saldo").first()
                disponivel = int(getattr(best, "saldo", 0) or 0) if best else 0
                necessario = int(material.quantidade or 0)

                if disponivel < necessario:
                    faltas.append(
                        f"{material.produto.nome} (produto_id={material.produto_id}): "
                        f"necessario {necessario}, disponivel {disponivel}"
                    )

            if faltas:
                raise ValidationError(
                    {
                        "estoque": (
                            "Estoque insuficiente na farmácia para emitir a fatura. "
                            "Atualize o estoque e tente novamente."
                        ),
                        "itens": faltas,
                    }
                )

            # Baixa/lança o estoque pendente antes de emitir.
            for material in pendentes:
                material.save(alocar_estoque=True)

        self.persistir_totais()
        self.estado = self.Estado.EMITIDA
        self.save(update_fields=["estado", "subtotal", "iva_valor", "total", "valor_paciente"])
        try:
            linhas = [
                f"Origem: {self.get_origem_display()}",
                f"Paciente: {getattr(self.paciente, 'nome', '-')}",
                f"Total sem IVA: {self.subtotal:.2f}",
                f"IVA: {self.iva_valor:.2f}",
                f"Total com IVA: {self.total:.2f}",
            ]
            self.registrar_historico("EMISSAO", "Fatura emitida", linhas=linhas)
        except Exception:
            pass

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
