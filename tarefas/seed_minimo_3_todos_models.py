from datetime import date, timedelta
from decimal import Decimal
from uuid import uuid4

from django.apps import apps
from django.utils import timezone

from aplicativos.clinico.modelos.exame import Exame
from aplicativos.clinico.modelos.exame_campo import ExameCampo
from aplicativos.clinico.modelos.paciente import Paciente
from aplicativos.clinico.modelos.referencia_clinica import ReferenciaClinica
from aplicativos.clinico.modelos.requisicao_analise import RequisicaoAnalise
from aplicativos.clinico.modelos.requisicao_item import RequisicaoItem
from aplicativos.clinico.modelos.resultado import Resultado
from aplicativos.clinico.modelos.resultado_analise import ResultadoItem
from aplicativos.contabilidade.modelos.conciliacao import ConciliacaoFinanceira
from aplicativos.contabilidade.modelos.contas import Conta
from aplicativos.contabilidade.modelos.lancamento import Lancamento
from aplicativos.contabilidade.modelos.ledger_entry import LedgerEntry
from aplicativos.contabilidade.modelos.ledger_line import LedgerLine
from aplicativos.contabilidade.modelos.movimento import Movimento
from aplicativos.contabilidade.modelos.saldo_conta import SaldoConta
from aplicativos.enfermagem.modelos import (
    Procedimento,
    ProcedimentoCatalogo,
    ProcedimentoCatalogoMaterial,
    ProcedimentoItem,
    ProcedimentoItemValor,
    ProcedimentoMaterial,
    ProcedimentoMaterialValor,
    RegistroEnfermagem,
    SinalVitalEnfermagem,
)
from aplicativos.farmacia.models.categoria_produto import CategoriaProduto
from aplicativos.farmacia.models.item_venda import ItemVenda
from aplicativos.farmacia.models.lote import Lote
from aplicativos.farmacia.models.movimento import MovimentoEstoque, TipoMovimento
from aplicativos.farmacia.models.produto import Produto
from aplicativos.farmacia.models.venda import Venda
from aplicativos.faturamento.modelos.fatura import Fatura
from aplicativos.faturamento.modelos.fatura_itens import FaturaItem
from aplicativos.faturamento.modelos.historico_fatura import HistoricoFatura
from aplicativos.identidade.modelos.password_reset import PasswordResetToken
from aplicativos.identidade.modelos.perfil import PerfilProfissional
from aplicativos.identidade.modelos.usuario import Usuario
from aplicativos.inquilinos.modelos.configuracao import ConfiguracaoInquilino
from aplicativos.inquilinos.modelos.inquilino import Inquilino
from aplicativos.inquilinos.modelos.uso_tenant import UsoTenant
from aplicativos.notificacoes.modelos.log_envio import LogEnvio
from aplicativos.notificacoes.modelos.notificacao import Notificacao
from aplicativos.notificacoes.modelos.template import TemplateNotificacao
from aplicativos.pagamentos.modelos.pagamentos import Pagamento
from aplicativos.pagamentos.modelos.recibo import Recibo
from aplicativos.pagamentos.modelos.reconciliacao import Reconciliacao
from aplicativos.pagamentos.modelos.transacao import Transacao
from aplicativos.seguradora.modelos.autorizacao import AutorizacaoProcedimento
from aplicativos.seguradora.modelos.plano_cobertura import PlanoCobertura
from aplicativos.seguradora.modelos.seguradora import Seguradora

MIN_REGISTROS = 3


def mgr(model):
    return getattr(model, "all_objects", model.objects)


def total(model):
    return mgr(model).count()


def choice_value(model, field_name):
    choices = list(model._meta.get_field(field_name).choices)
    return choices[0][0] if choices else None


def unique_str(model, field_name, prefix):
    i = 1
    while True:
        value = f"{prefix}{i}"
        if not mgr(model).filter(**{field_name: value}).exists():
            return value
        i += 1


def ensure_inquilinos():
    while total(Inquilino) < MIN_REGISTROS:
        idx = total(Inquilino) + 1
        identificador = unique_str(Inquilino, "identificador", "seed-inq-")
        Inquilino.objects.create(
            identificador=identificador,
            nome=f"Inquilino Seed {idx}",
            ativo=True,
        )

    return list(Inquilino.objects.order_by("id")[:MIN_REGISTROS])


def ensure_usuarios():
    while Usuario.objects.count() < MIN_REGISTROS:
        idx = Usuario.objects.count() + 1
        email = f"seed.user{idx}@example.com"
        while Usuario.objects.filter(email=email).exists():
            idx += 1
            email = f"seed.user{idx}@example.com"
        Usuario.objects.create_user(
            email=email,
            password="Seed@123456",
            first_name=f"Seed{idx}",
            last_name="User",
            telefone=f"840000{idx:03d}",
            is_active=True,
        )

    return list(Usuario.objects.order_by("id")[:MIN_REGISTROS])


def ensure_config_uso(tenants):
    for idx, tenant in enumerate(tenants, start=1):
        ConfiguracaoInquilino.objects.get_or_create(
            inquilino=tenant,
            defaults={
                "fuso_horario": "Africa/Maputo",
                "moeda": "MZN",
                "idioma": "pt",
                "permite_multi_unidade": idx % 2 == 0,
                "limite_usuarios": 10 + idx,
            },
        )
        UsoTenant.objects.get_or_create(
            inquilino=tenant,
            defaults={
                "usuarios_ativos": 5 + idx,
                "requisicoes_mes_atual": 10 * idx,
            },
        )


def ensure_clinico(tenants, users):
    metodo = choice_value(Exame, "metodo")
    setor = choice_value(Exame, "setor")
    tipo_resultado = choice_value(ExameCampo, "tipo")
    unidade = choice_value(ExameCampo, "unidade")
    genero = choice_value(Paciente, "genero")
    raca = choice_value(Paciente, "raca_origem")
    tipo_documento = choice_value(Paciente, "tipo_documento")
    proveniencia = choice_value(Paciente, "proveniencia")

    while total(Exame) < MIN_REGISTROS:
        idx = total(Exame) + 1
        tenant = tenants[(idx - 1) % len(tenants)]
        Exame.objects.create(
            inquilino=tenant,
            nome=f"Exame Seed {idx}",
            trl_horas=24 + idx,
            preco=Decimal("50.00") + Decimal(idx),
            metodo=metodo,
            setor=setor,
        )

    exames = list(Exame.objects.order_by("id"))

    while total(ExameCampo) < MIN_REGISTROS:
        idx = total(ExameCampo) + 1
        exame = exames[(idx - 1) % len(exames)]
        ExameCampo.objects.create(
            inquilino=exame.inquilino,
            nome=f"Campo Seed {idx}",
            exame=exame,
            tipo=tipo_resultado,
            unidade=unidade,
            referencia_min=Decimal("4.00"),
            referencia_max=Decimal("10.00"),
            critico_min=Decimal("2.00"),
            critico_max=Decimal("20.00"),
        )

    while total(Paciente) < MIN_REGISTROS:
        idx = total(Paciente) + 1
        tenant = tenants[(idx - 1) % len(tenants)]
        Paciente.objects.create(
            inquilino=tenant,
            nome=f"Paciente Seed {idx}",
            morada=f"Rua Seed {idx}",
            genero=genero,
            raca_origem=raca,
            tipo_documento=tipo_documento,
            numero_id=f"SEED-ID-{idx:04d}",
            contacto=f"840100{idx:03d}",
            email=f"paciente.seed{idx}@example.com",
            proveniencia=proveniencia,
            data_nascimento=date(1990, 1, 1) + timedelta(days=30 * idx),
        )

    pacientes = list(Paciente.objects.order_by("id"))

    while total(RequisicaoAnalise) < MIN_REGISTROS:
        idx = total(RequisicaoAnalise) + 1
        paciente = pacientes[(idx - 1) % len(pacientes)]
        analista = users[(idx - 1) % len(users)]
        RequisicaoAnalise.objects.create(
            inquilino=paciente.inquilino,
            paciente=paciente,
            analista=analista,
        )

    requisicoes = list(RequisicaoAnalise.objects.order_by("id")[:MIN_REGISTROS])
    exames_seed = list(Exame.objects.order_by("id")[:MIN_REGISTROS])

    for idx, req in enumerate(requisicoes, start=1):
        exame = exames_seed[(idx - 1) % len(exames_seed)]
        RequisicaoItem.objects.get_or_create(
            requisicao=req,
            exame=exame,
            defaults={"inquilino": req.inquilino},
        )

    if total(RequisicaoItem) < MIN_REGISTROS:
        for req in requisicoes:
            for exame in exames_seed:
                if total(RequisicaoItem) >= MIN_REGISTROS:
                    break
                RequisicaoItem.objects.get_or_create(
                    requisicao=req,
                    exame=exame,
                    defaults={"inquilino": req.inquilino},
                )
            if total(RequisicaoItem) >= MIN_REGISTROS:
                break

    for idx, req in enumerate(requisicoes, start=1):
        Resultado.objects.get_or_create(
            requisicao=req,
            defaults={
                "inquilino": req.inquilino,
                "analista": users[(idx - 1) % len(users)],
            },
        )

    resultados = list(Resultado.objects.order_by("id"))
    campos = list(ExameCampo.objects.order_by("id"))

    for idx in range(max(len(resultados), len(campos))):
        if total(ResultadoItem) >= MIN_REGISTROS:
            break
        resultado = resultados[idx % len(resultados)]
        campo = campos[idx % len(campos)]
        ResultadoItem.objects.get_or_create(
            resultado=resultado,
            exame_campo=campo,
            defaults={"inquilino": resultado.inquilino},
        )

    while total(ReferenciaClinica) < MIN_REGISTROS:
        idx = total(ReferenciaClinica) + 1
        campo = campos[(idx - 1) % len(campos)]
        ReferenciaClinica.objects.create(
            inquilino=campo.inquilino,
            nome=f"Referência Seed {idx}",
            exame_campo=campo,
            idade_minima_dias=0,
            idade_maxima_dias=36500,
            valor_minimo=Decimal("4.00"),
            valor_maximo=Decimal("10.00"),
            critico_baixo=Decimal("2.00"),
            critico_alto=Decimal("20.00"),
        )


def ensure_enfermagem(users):
    pacientes = list(Paciente.objects.order_by("id")[:MIN_REGISTROS])
    produtos = list(Produto.objects.order_by("id"))

    prioridade = choice_value(RegistroEnfermagem, "prioridade")

    while total(RegistroEnfermagem) < MIN_REGISTROS:
        idx = total(RegistroEnfermagem) + 1
        paciente = pacientes[(idx - 1) % len(pacientes)]
        RegistroEnfermagem.objects.create(
            inquilino=paciente.inquilino,
            nome=f"Registro Enfermagem Seed {idx}",
            paciente=paciente,
            prioridade=prioridade,
            observacao=f"Observação de enfermagem seed {idx}",
        )

    registros = list(RegistroEnfermagem.objects.order_by("id")[:MIN_REGISTROS])
    while total(SinalVitalEnfermagem) < MIN_REGISTROS:
        idx = total(SinalVitalEnfermagem) + 1
        registro = registros[(idx - 1) % len(registros)]
        SinalVitalEnfermagem.objects.create(
            inquilino=registro.inquilino,
            nome=f"Sinal Vital Seed {idx}",
            registro=registro,
            temperatura_c=Decimal("36.5"),
            frequencia_cardiaca=75 + idx,
            frequencia_respiratoria=18,
            saturacao_oxigenio=98,
            pressao_arterial="120/80",
        )

    while total(Procedimento) < MIN_REGISTROS:
        idx = total(Procedimento) + 1
        paciente = pacientes[(idx - 1) % len(pacientes)]
        Procedimento.objects.create(
            inquilino=paciente.inquilino,
            paciente=paciente,
            profissional=users[(idx - 1) % len(users)],
            observacoes=f"Procedimento seed {idx}",
        )

    while total(ProcedimentoCatalogo) < MIN_REGISTROS:
        idx = total(ProcedimentoCatalogo) + 1
        paciente = pacientes[(idx - 1) % len(pacientes)]
        ProcedimentoCatalogo.objects.create(
            inquilino=paciente.inquilino,
            nome=f"Procedimento Catálogo {idx}",
            descricao=f"Descrição catálogo seed {idx}",
            preco_padrao=Decimal("350.00") + Decimal(idx),
        )

    catalogos = list(ProcedimentoCatalogo.objects.order_by("id"))
    while total(ProcedimentoCatalogoMaterial) < MIN_REGISTROS:
        idx = total(ProcedimentoCatalogoMaterial) + 1
        catalogo = catalogos[(idx - 1) % len(catalogos)]

        produto = next(
            (
                candidato
                for candidato in produtos
                if candidato.inquilino_id == catalogo.inquilino_id
                and not ProcedimentoCatalogoMaterial.objects.filter(catalogo=catalogo, produto=candidato).exists()
            ),
            None,
        )
        if produto is None:
            break

        ProcedimentoCatalogoMaterial.objects.create(
            inquilino=catalogo.inquilino,
            catalogo=catalogo,
            produto=produto,
            quantidade_padrao=1,
            custo_unitario_padrao=produto.preco_venda,
            observacao=f"Material padrão seed {idx}",
        )

    procedimentos = list(Procedimento.objects.order_by("id")[:MIN_REGISTROS])
    while total(ProcedimentoItem) < MIN_REGISTROS:
        idx = total(ProcedimentoItem) + 1
        procedimento = procedimentos[(idx - 1) % len(procedimentos)]
        catalogo = next(
            (c for c in catalogos if c.inquilino_id == procedimento.inquilino_id),
            None,
        )
        ProcedimentoItem.objects.create(
            inquilino=procedimento.inquilino,
            procedimento=procedimento,
            catalogo=catalogo,
            descricao="" if catalogo else f"Item de procedimento seed {idx}",
            quantidade=1,
            preco_unitario=Decimal("0.00") if catalogo else Decimal("150.00"),
            realizado=True,
            observacao=f"Observação seed {idx}",
        )

    lotes = list(Lote.objects.select_related("produto").order_by("validade", "id"))

    while total(ProcedimentoMaterial) < MIN_REGISTROS:
        idx = total(ProcedimentoMaterial) + 1
        procedimento = procedimentos[(idx - 1) % len(procedimentos)]
        lote = next(
            (
                candidato
                for candidato in lotes
                if candidato.inquilino_id == procedimento.inquilino_id and candidato.saldo() > 0
            ),
            None,
        )
        if lote is None:
            break

        ProcedimentoMaterial.objects.create(
            inquilino=procedimento.inquilino,
            procedimento=procedimento,
            produto=lote.produto,
            lote=lote,
            quantidade=1,
            custo_unitario=lote.produto.preco_venda,
            observacao=f"Material seed {idx}",
        )

    for item in ProcedimentoItem.objects.filter(deletado=False):
        if not ProcedimentoItemValor.objects.filter(item=item, deletado=False).exists():
            item.save()

    for material in ProcedimentoMaterial.objects.filter(deletado=False):
        if not ProcedimentoMaterialValor.objects.filter(material=material, deletado=False).exists():
            material.save()


def ensure_seguradora(tenants):
    while total(Seguradora) < MIN_REGISTROS:
        idx = total(Seguradora) + 1
        tenant = tenants[(idx - 1) % len(tenants)]
        Seguradora.objects.create(
            inquilino=tenant,
            nome=f"Seguradora Seed {idx}",
            codigo_externo=f"SEG-{idx:03d}",
            email=f"seguradora{idx}@example.com",
            telefone=f"840200{idx:03d}",
            ativa=True,
        )

    seguradoras = list(Seguradora.objects.order_by("id"))

    while total(PlanoCobertura) < MIN_REGISTROS:
        idx = total(PlanoCobertura) + 1
        seg = seguradoras[(idx - 1) % len(seguradoras)]
        PlanoCobertura.objects.create(
            inquilino=seg.inquilino,
            nome=f"Plano Seed {idx}",
            seguradora=seg,
            percentual_cobertura=Decimal("80.00"),
            exige_autorizacao=idx % 2 == 0,
        )

    planos = list(PlanoCobertura.objects.order_by("id"))

    while total(AutorizacaoProcedimento) < MIN_REGISTROS:
        idx = total(AutorizacaoProcedimento) + 1
        plano = planos[(idx - 1) % len(planos)]
        AutorizacaoProcedimento.objects.create(
            inquilino=plano.inquilino,
            nome=f"Autorização Seed {idx}",
            requisicao_id=uuid4(),
            plano=plano,
        )


def ensure_faturamento():
    requisicoes = list(RequisicaoAnalise.objects.order_by("id")[:MIN_REGISTROS])
    exames = list(Exame.objects.order_by("id"))

    for req in requisicoes:
        Fatura.objects.get_or_create(
            requisicao=req,
            defaults={
                "inquilino": req.inquilino,
                "paciente": req.paciente,
            },
        )

    faturas = list(Fatura.objects.order_by("id"))

    for idx, fatura in enumerate(faturas, start=1):
        exame = exames[(idx - 1) % len(exames)]
        FaturaItem.objects.get_or_create(
            fatura=fatura,
            exame=exame,
            defaults={
                "inquilino": fatura.inquilino,
                "descricao": exame.nome,
                "quantidade": Decimal("1.00"),
            },
        )

    while total(HistoricoFatura) < MIN_REGISTROS:
        idx = total(HistoricoFatura) + 1
        fatura = faturas[(idx - 1) % len(faturas)]
        HistoricoFatura.objects.create(
            inquilino=fatura.inquilino,
            nome=f"Histórico Seed {idx}",
            fatura=fatura,
            descricao=f"Evento de histórico seed {idx}",
            tipo_evento="SEED",
        )


def ensure_pagamentos():
    metodo = choice_value(Pagamento, "metodo")
    faturas = list(Fatura.objects.order_by("id")[:MIN_REGISTROS])

    while total(Pagamento) < MIN_REGISTROS:
        idx = total(Pagamento) + 1
        fatura = faturas[(idx - 1) % len(faturas)]
        valor = fatura.total if fatura.total and fatura.total > 0 else Decimal("100.00")
        Pagamento.objects.create(
            inquilino=fatura.inquilino,
            nome=f"Pagamento Seed {idx}",
            fatura=fatura,
            valor=valor,
            metodo=metodo,
            referencia_externa=f"PG-SEED-{idx:04d}",
        )

    while total(Transacao) < MIN_REGISTROS:
        idx = total(Transacao) + 1
        Transacao.objects.create(
            referencia_externa=f"TX-SEED-{idx:04d}",
            gateway="SEED_GATEWAY",
            status="confirmada",
            resposta_gateway={"seed": idx},
        )

    pagamentos = list(Pagamento.objects.order_by("id")[:MIN_REGISTROS])
    transacoes = list(Transacao.objects.order_by("id")[:MIN_REGISTROS])

    while total(Recibo) < MIN_REGISTROS:
        idx = total(Recibo) + 1
        pagamento = pagamentos[(idx - 1) % len(pagamentos)]
        Recibo.objects.create(
            fatura=pagamento.fatura,
            pagamento=pagamento,
            numero=f"RCB-SEED-{idx:04d}",
            valor=pagamento.valor,
        )

    while total(Reconciliacao) < MIN_REGISTROS:
        idx = total(Reconciliacao) + 1
        transacao = transacoes[(idx - 1) % len(transacoes)]
        Reconciliacao.objects.create(
            transacao=transacao,
            confirmado=idx % 2 == 0,
            data_confirmacao=timezone.now() if idx % 2 == 0 else None,
        )


def ensure_contabilidade(tenants):
    tipo_conta = choice_value(Conta, "tipo")
    contas = list(Conta.objects.order_by("id"))

    while total(Conta) < MIN_REGISTROS:
        idx = total(Conta) + 1
        tenant = tenants[(idx - 1) % len(tenants)]
        conta = Conta.objects.create(
            inquilino=tenant,
            nome=f"Conta Seed {idx}",
            tipo=tipo_conta,
        )
        contas.append(conta)

    contas = list(Conta.objects.order_by("id")[:MIN_REGISTROS])

    while total(Lancamento) < MIN_REGISTROS:
        idx = total(Lancamento) + 1
        tenant = tenants[(idx - 1) % len(tenants)]
        Lancamento.objects.create(
            inquilino=tenant,
            nome=f"Lançamento Seed {idx}",
            descricao=f"Lançamento de seed {idx}",
            referencia_externa=f"LANC-SEED-{idx:04d}",
        )

    lancamentos = list(Lancamento.objects.order_by("id")[:MIN_REGISTROS])

    for idx, lancamento in enumerate(lancamentos, start=1):
        contas_tenant = [c for c in contas if c.inquilino_id == lancamento.inquilino_id]
        conta_debito = contas_tenant[0]
        conta_credito = contas_tenant[-1]

        if not Movimento.objects.filter(lancamento=lancamento, debito__gt=0).exists():
            Movimento.objects.create(
                inquilino=lancamento.inquilino,
                nome=f"Mov Deb Seed {idx}",
                lancamento=lancamento,
                conta=conta_debito,
                debito=Decimal("100.00"),
                credito=Decimal("0.00"),
            )

        if not Movimento.objects.filter(lancamento=lancamento, credito__gt=0).exists():
            Movimento.objects.create(
                inquilino=lancamento.inquilino,
                nome=f"Mov Cred Seed {idx}",
                lancamento=lancamento,
                conta=conta_credito,
                debito=Decimal("0.00"),
                credito=Decimal("100.00"),
            )

    while total(LedgerEntry) < MIN_REGISTROS:
        idx = total(LedgerEntry) + 1
        tenant = tenants[(idx - 1) % len(tenants)]
        LedgerEntry.objects.create(
            inquilino=tenant,
            nome=f"Ledger Entry Seed {idx}",
            referencia_externa=f"LED-REF-{idx:04d}",
            idempotency_key=f"LED-IDEMP-{idx:04d}",
            data_contabil=timezone.localdate(),
            descricao=f"Entry de seed {idx}",
        )

    entries = list(LedgerEntry.objects.order_by("id")[:MIN_REGISTROS])

    for idx, entry in enumerate(entries, start=1):
        conta_debito = next(c for c in contas if c.inquilino_id == entry.inquilino_id)
        conta_credito = [c for c in contas if c.inquilino_id == entry.inquilino_id][-1]

        if not LedgerLine.objects.filter(entry=entry, natureza="D").exists():
            LedgerLine.objects.create(
                inquilino=entry.inquilino,
                nome=f"Linha D Seed {idx}",
                entry=entry,
                conta=conta_debito,
                valor=Decimal("50.00"),
                natureza="D",
            )

        if not LedgerLine.objects.filter(entry=entry, natureza="C").exists():
            LedgerLine.objects.create(
                inquilino=entry.inquilino,
                nome=f"Linha C Seed {idx}",
                entry=entry,
                conta=conta_credito,
                valor=Decimal("50.00"),
                natureza="C",
            )

    for conta in contas:
        SaldoConta.objects.get_or_create(conta=conta)

    faturas = list(Fatura.objects.order_by("id")[:MIN_REGISTROS])
    while total(ConciliacaoFinanceira) < MIN_REGISTROS:
        idx = total(ConciliacaoFinanceira) + 1
        fatura = faturas[(idx - 1) % len(faturas)]
        ConciliacaoFinanceira.objects.create(
            inquilino=fatura.inquilino,
            nome=f"Conciliação Seed {idx}",
            fatura=fatura,
            valor_contabil=Decimal("100.00"),
            valor_recebido=Decimal("100.00"),
            divergencia=Decimal("0.00"),
            conciliado=True,
            referencia_externa=f"CON-SEED-{idx:04d}",
        )


def ensure_farmacia(tenants):
    categorias = list(CategoriaProduto.objects.order_by("id"))

    while total(Produto) < MIN_REGISTROS:
        idx = total(Produto) + 1
        categoria = categorias[(idx - 1) % len(categorias)]
        Produto.objects.create(
            inquilino=categoria.inquilino,
            nome=f"Produto Seed {idx}",
            categoria=categoria,
            preco_venda=Decimal("25.00") + Decimal(idx),
            estoque_minimo=5,
        )

    produtos = list(Produto.objects.order_by("id"))

    while total(Lote) < MIN_REGISTROS:
        idx = total(Lote) + 1
        produto = produtos[(idx - 1) % len(produtos)]
        Lote.objects.create(
            inquilino=produto.inquilino,
            nome=f"Lote Seed {idx}",
            produto=produto,
            numero_lote=f"SEED-LOT-{idx:04d}",
            validade=timezone.localdate() + timedelta(days=365 + idx),
            quantidade_inicial=100,
        )

    while total(Venda) < MIN_REGISTROS:
        idx = total(Venda) + 1
        tenant = tenants[(idx - 1) % len(tenants)]
        Venda.objects.create(inquilino=tenant)

    vendas = list(Venda.objects.order_by("id")[:MIN_REGISTROS])
    produtos_seed = list(Produto.objects.order_by("id"))

    for idx, venda in enumerate(vendas, start=1):
        produto = None
        for offset in range(len(produtos_seed)):
            candidato = produtos_seed[(idx - 1 + offset) % len(produtos_seed)]
            if candidato.inquilino_id == venda.inquilino_id:
                produto = candidato
                break
        if produto is None:
            continue

        if not ItemVenda.objects.filter(venda=venda, produto=produto).exists():
            ItemVenda.objects.create(
                inquilino=venda.inquilino,
                nome=f"Item Venda Seed {idx}",
                venda=venda,
                produto=produto,
                quantidade=1,
            )

    while total(ItemVenda) < MIN_REGISTROS:
        produto = Produto.objects.order_by("id").first()
        venda = (
            Venda.objects.filter(inquilino_id=produto.inquilino_id)
            .exclude(itens__produto=produto)
            .order_by("id")
            .first()
        )
        if venda is None:
            venda = Venda.objects.create(inquilino_id=produto.inquilino_id)
        ItemVenda.objects.create(
            inquilino=produto.inquilino,
            nome=f"Item Extra Seed {total(ItemVenda) + 1}",
            venda=venda,
            produto=produto,
            quantidade=1,
        )

    while total(MovimentoEstoque) < MIN_REGISTROS:
        idx = total(MovimentoEstoque) + 1
        lote = Lote.objects.order_by("id").first()
        MovimentoEstoque.objects.create(
            inquilino=lote.inquilino,
            nome=f"Movimento Seed {idx}",
            lote=lote,
            tipo=TipoMovimento.ENTRADA,
            quantidade=1,
        )


def ensure_identidade(users):
    for idx, user in enumerate(users, start=1):
        PerfilProfissional.objects.get_or_create(
            usuario=user,
            defaults={
                "cargo": "Analista",
                "registro_profissional": f"REG-SEED-{idx:04d}",
                "departamento": "Laboratório",
            },
        )

    while PasswordResetToken.objects.count() < MIN_REGISTROS:
        idx = PasswordResetToken.objects.count() + 1
        user = users[(idx - 1) % len(users)]
        PasswordResetToken.objects.create(user=user)


def ensure_notificacoes():
    while TemplateNotificacao.objects.count() < MIN_REGISTROS:
        idx = TemplateNotificacao.objects.count() + 1
        TemplateNotificacao.objects.create(
            nome=f"Template Seed {idx}",
            conteudo=f"Conteúdo seed {idx}",
        )

    while Notificacao.objects.count() < MIN_REGISTROS:
        idx = Notificacao.objects.count() + 1
        Notificacao.objects.create(
            destinatario=f"destinatario{idx}@example.com",
            canal="email",
            mensagem=f"Mensagem seed {idx}",
            enviada=idx % 2 == 0,
        )

    notificacoes = list(Notificacao.objects.order_by("id")[:MIN_REGISTROS])
    while LogEnvio.objects.count() < MIN_REGISTROS:
        idx = LogEnvio.objects.count() + 1
        notificacao = notificacoes[(idx - 1) % len(notificacoes)]
        LogEnvio.objects.create(
            notificacao=notificacao,
            status="enviado",
            resposta=f"Resposta seed {idx}",
        )


def report():
    faltando = []
    app_configs = sorted(
        [cfg for cfg in apps.get_app_configs() if cfg.name.startswith("aplicativos.")],
        key=lambda c: c.label,
    )
    for cfg in app_configs:
        for model in cfg.get_models():
            if model._meta.abstract or model._meta.proxy:
                continue
            qtd = total(model)
            if qtd < MIN_REGISTROS:
                faltando.append(f"{cfg.label}.{model.__name__} ({qtd})")

    if faltando:
        for _item in faltando:
            pass
    else:
        pass


def main():
    tenants = ensure_inquilinos()
    users = ensure_usuarios()
    ensure_config_uso(tenants)
    ensure_clinico(tenants, users)
    ensure_farmacia(tenants)
    ensure_enfermagem(users)
    ensure_seguradora(tenants)
    ensure_faturamento()
    ensure_pagamentos()
    ensure_contabilidade(tenants)
    ensure_identidade(users)
    ensure_notificacoes()
    report()


main()
