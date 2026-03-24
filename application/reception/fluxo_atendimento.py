from decimal import ROUND_HALF_UP, Decimal

from django.core.exceptions import ValidationError
from django.db import transaction

from apps.clinical.models.lab_exam import LabExam
from apps.clinical.models.patient import Patient
from apps.clinical.models.lab_request import LabRequest
from apps.clinical.models.lab_request_item import LabRequestItem
from apps.clinical.models.result import Result
from apps.billing.models.invoice import Invoice
from apps.payments.models.payment import Payment
from apps.payments.models.receipt import Receipt
from apps.reception.models.checkin_recepcao import CheckinRecepcao
from apps.insurer.models.coverage_plan import CoveragePlan
from apps.insurer.models.insurer import Insurer


def _quantizar_valor(valor):
    if valor is None:
        return None

    return Decimal(valor).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def _resolver_paciente(inquilino, paciente_id=None, paciente=None):
    paciente = paciente or {}

    if paciente_id:
        paciente_obj = Patient.objects.filter(inquilino=inquilino, deletado=False).first()
        paciente_obj = Patient.objects.filter(inquilino=inquilino, pk=paciente_id).first()
        if not paciente_obj:
            raise ValidationError({"paciente_id": "Paciente não encontrado para este tenant."})

        for campo, valor in paciente.items():
            setattr(paciente_obj, campo, valor)
    else:
        nome = (paciente.get("nome") or "").strip()
        morada = (paciente.get("morada") or "").strip()

        if not nome:
            raise ValidationError({"paciente": {"nome": "Nome é obrigatório."}})
        if not morada:
            raise ValidationError({"paciente": {"morada": "Morada é obrigatória."}})

        paciente_obj = Patient(inquilino=inquilino, **paciente)

    paciente_obj.inquilino = inquilino
    paciente_obj.full_clean()
    paciente_obj.save()
    return paciente_obj


@transaction.atomic
def abrir_checkin(
    *,
    inquilino,
    paciente,
    prioridade=None,
    motivo="",
    observacoes="",
    atendente=None,
):
    return CheckinRecepcao.objects.create(
        inquilino=inquilino,
        paciente=paciente,
        prioridade=prioridade or CheckinRecepcao.Prioridade.NORMAL,
        motivo=motivo or "",
        observacoes=observacoes or "",
        atendente=atendente,
    )


@transaction.atomic
def criar_requisicao_para_checkin(
    *,
    checkin,
    exame_ids,
    status_clinico=None,
):
    if checkin.requisicao_id:
        raise ValidationError("Check-in já possui requisição vinculada.")

    ids = list(dict.fromkeys(exame_ids or []))
    if not ids:
        raise ValidationError({"requisicao": {"exames_ids": "Informe ao menos um exame."}})

    exames = list(
        LabExam.objects.filter(
            inquilino=checkin.inquilino,
            pk__in=ids,
            deletado=False,
        ).order_by("pk")
    )

    if len(exames) != len(ids):
        raise ValidationError({"requisicao": {"exames_ids": "Um ou mais exames são inválidos para este tenant."}})

    requisicao = LabRequest(
        inquilino=checkin.inquilino,
        paciente=checkin.paciente,
    )

    if status_clinico:
        requisicao.status_clinico = status_clinico

    requisicao.full_clean()
    requisicao.save()

    for exame in exames:
        item = LabRequestItem(
            inquilino=checkin.inquilino,
            requisicao=requisicao,
            exame=exame,
        )
        item.full_clean()
        item.save()

    Result.objects.create(
        requisicao=requisicao,
        inquilino=checkin.inquilino,
    )

    checkin.registrar_requisicao(requisicao)
    return requisicao


@transaction.atomic
def criar_fatura_para_checkin(
    *,
    checkin,
    emitir=True,
):
    if checkin.fatura_id:
        raise ValidationError("Check-in já possui fatura vinculada.")

    if not checkin.requisicao_id:
        raise ValidationError("Crie ou vincule uma requisição antes da fatura.")

    fatura = Invoice(
        inquilino=checkin.inquilino,
        origem=Invoice.Origem.CLINICO,
        requisicao=checkin.requisicao,
        paciente=checkin.paciente,
    )
    fatura.full_clean()
    fatura.save()
    fatura.sincronizar_itens_da_origem()

    if emitir:
        fatura.emitir()

    checkin.registrar_fatura(fatura)
    return fatura


@transaction.atomic
def registrar_pagamento_para_checkin(
    *,
    checkin,
    valor=None,
    metodo=Payment.Metodo.DINHEIRO,
    referencia_externa="",
    seguradora_id=None,
    plano_cobertura_id=None,
    numero_autorizacao="",
    dados_seguro=None,
    confirmar=True,
):
    if not checkin.fatura_id:
        raise ValidationError("Check-in não possui fatura vinculada.")

    fatura = checkin.fatura
    if fatura.estado == Invoice.Estado.RASCUNHO:
        raise ValidationError("Emita a fatura antes de registrar pagamento.")

    valor_pagamento = _quantizar_valor(valor or fatura.total)
    if valor_pagamento <= Decimal("0.00"):
        raise ValidationError({"pagamento": {"valor": "Valor do pagamento deve ser maior que zero."}})

    seguradora = None
    plano_cobertura = None
    numero_autorizacao = (numero_autorizacao or "").strip()

    if metodo == Payment.Metodo.SEGURO_SAUDE:
        if not seguradora_id:
            raise ValidationError({"pagamento": {"seguradora_id": "Informe a seguradora do seguro de saúde."}})

        seguradora = Insurer.objects.filter(inquilino=checkin.inquilino, pk=seguradora_id).first()
        if not seguradora:
            raise ValidationError({"pagamento": {"seguradora_id": "Seguradora não encontrada para este tenant."}})

        if plano_cobertura_id:
            plano_cobertura = CoveragePlan.objects.filter(
                inquilino=checkin.inquilino, pk=plano_cobertura_id
            ).first()
            if not plano_cobertura:
                raise ValidationError(
                    {"pagamento": {"plano_cobertura_id": "Plano de cobertura não encontrado para este tenant."}}
                )
            if plano_cobertura.seguradora_id != seguradora.id:
                raise ValidationError(
                    {"pagamento": {"plano_cobertura_id": "Plano de cobertura não pertence à seguradora selecionada."}}
                )

        if not numero_autorizacao:
            raise ValidationError({"pagamento": {"numero_autorizacao": "Informe o número de autorização do seguro."}})

    pagamento = Payment(
        inquilino=checkin.inquilino,
        nome=f"Pagamento {fatura.id_custom or fatura.pk}",
        fatura=fatura,
        valor=valor_pagamento,
        metodo=metodo,
        referencia_externa=referencia_externa or "",
        seguradora=seguradora,
        plano_cobertura=plano_cobertura,
        numero_autorizacao=numero_autorizacao or "",
        dados_seguro=dados_seguro or {},
    )
    pagamento.full_clean()
    pagamento.save()

    if confirmar:
        pagamento.confirmar()

    recibo = Receipt.objects.filter(pagamento=pagamento).order_by("-criado_em", "-id").first()
    return pagamento, recibo


def obter_resumo_atendimento(checkin):
    checkin = (
        CheckinRecepcao.objects.select_related(
            "paciente",
            "requisicao",
            "fatura",
            "atendente",
        )
        .prefetch_related(
            "requisicao__itens__exame",
            "fatura__itens",
            "fatura__pagamentos",
            "fatura__recibos",
        )
        .get(pk=checkin.pk)
    )

    requisicao = checkin.requisicao
    fatura = checkin.fatura
    pagamentos = list(fatura.pagamentos.order_by("-criado_em")) if fatura else []
    recibos = list(fatura.recibos.order_by("-criado_em")) if fatura else []

    return {
        "checkin": {
            "id": checkin.id,
            "id_custom": checkin.id_custom,
            "estado": checkin.estado,
            "estado_display": checkin.get_estado_display(),
            "prioridade": checkin.prioridade,
            "prioridade_display": checkin.get_prioridade_display(),
            "motivo": checkin.motivo,
            "observacoes": checkin.observacoes,
            "chegou_em": checkin.chegou_em.isoformat() if checkin.chegou_em else None,
            "chamado_em": checkin.chamado_em.isoformat() if checkin.chamado_em else None,
            "concluido_em": checkin.concluido_em.isoformat() if checkin.concluido_em else None,
            "atendente": (
                checkin.atendente.get_full_name() or checkin.atendente.username if checkin.atendente_id else ""
            ),
        },
        "paciente": {
            "id": checkin.paciente_id,
            "id_custom": checkin.paciente.id_custom,
            "nome": checkin.paciente.nome,
            "numero_id": checkin.paciente.numero_id,
            "contacto": checkin.paciente.contacto,
            "morada": checkin.paciente.morada,
        },
        "requisicao": (
            {
                "id": requisicao.id,
                "id_custom": requisicao.id_custom,
                "estado": requisicao.estado,
                "status_clinico": requisicao.status_clinico,
                "exames": [
                    {
                        "id": item.exame_id,
                        "id_custom": item.exame.id_custom,
                        "nome": item.exame.nome,
                        "preco": str(item.exame.preco),
                    }
                    for item in requisicao.itens.all()
                ],
            }
            if requisicao
            else None
        ),
        "fatura": (
            {
                "id": fatura.id,
                "id_custom": fatura.id_custom,
                "estado": fatura.estado,
                "subtotal": str(fatura.subtotal),
                "iva_valor": str(fatura.iva_valor),
                "total": str(fatura.total),
                "valor_paciente": str(fatura.valor_paciente),
                "valor_seguro": str(fatura.valor_seguro),
                "itens": [
                    {
                        "id": item.id,
                        "id_custom": item.id_custom,
                        "descricao": item.descricao,
                        "quantidade": str(item.quantidade),
                        "preco_unitario": str(item.preco_unitario),
                        "total": str(item.total),
                    }
                    for item in fatura.itens.filter(deletado=False)
                ],
            }
            if fatura
            else None
        ),
        "pagamentos": [
            {
                "id": pagamento.id,
                "id_custom": pagamento.id_custom,
                "nome": pagamento.nome,
                "valor": str(pagamento.valor),
                "metodo": pagamento.metodo,
                "metodo_display": pagamento.get_metodo_display(),
                "status": pagamento.status,
                "status_display": pagamento.get_status_display(),
                "referencia_externa": pagamento.referencia_externa,
                "seguradora_id": pagamento.seguradora_id,
                "plano_cobertura_id": pagamento.plano_cobertura_id,
                "numero_autorizacao": pagamento.numero_autorizacao,
                "dados_seguro": pagamento.dados_seguro,
                "pago_em": pagamento.pago_em.isoformat() if pagamento.pago_em else None,
            }
            for pagamento in pagamentos
        ],
        "recibos": [
            {
                "id": recibo.id,
                "numero": recibo.numero,
                "valor": str(recibo.valor),
                "criado_em": recibo.criado_em.isoformat() if recibo.criado_em else None,
            }
            for recibo in recibos
        ],
    }


@transaction.atomic
def executar_fluxo_completo(
    *,
    inquilino,
    usuario=None,
    paciente_id=None,
    paciente=None,
    checkin=None,
    requisicao=None,
    faturamento=None,
    pagamento=None,
    concluir_checkin=False,
):
    paciente_obj = _resolver_paciente(
        inquilino=inquilino,
        paciente_id=paciente_id,
        paciente=dict(paciente or {}),
    )

    dados_checkin = dict(checkin or {})
    iniciar_atendimento = bool(dados_checkin.pop("iniciar_atendimento", False))

    checkin_obj = abrir_checkin(
        inquilino=inquilino,
        paciente=paciente_obj,
        prioridade=dados_checkin.get("prioridade"),
        motivo=dados_checkin.get("motivo", ""),
        observacoes=dados_checkin.get("observacoes", ""),
        atendente=usuario if usuario and iniciar_atendimento else None,
    )

    if iniciar_atendimento:
        checkin_obj.iniciar_atendimento(atendente=usuario)

    requisicao_obj = None
    if requisicao:
        dados_requisicao = dict(requisicao)
        requisicao_obj = criar_requisicao_para_checkin(
            checkin=checkin_obj,
            exame_ids=dados_requisicao.get("exames_ids", []),
            status_clinico=dados_requisicao.get("status_clinico"),
        )

    if faturamento or pagamento:
        if not checkin_obj.requisicao_id and not requisicao_obj:
            raise ValidationError("Fluxo financeiro requer uma requisição vinculada.")

        dados_faturamento = dict(faturamento or {})
        criar_fatura_para_checkin(
            checkin=checkin_obj,
            emitir=True if pagamento else dados_faturamento.get("emitir", True),
        )

    if pagamento:
        dados_pagamento = dict(pagamento)
        registrar_pagamento_para_checkin(
            checkin=checkin_obj,
            valor=dados_pagamento.get("valor"),
            metodo=dados_pagamento.get("metodo", Payment.Metodo.DINHEIRO),
            referencia_externa=dados_pagamento.get("referencia_externa", ""),
            seguradora_id=dados_pagamento.get("seguradora_id"),
            plano_cobertura_id=dados_pagamento.get("plano_cobertura_id"),
            numero_autorizacao=dados_pagamento.get("numero_autorizacao", ""),
            dados_seguro=dados_pagamento.get("dados_seguro"),
            confirmar=dados_pagamento.get("confirmar", True),
        )

    if concluir_checkin:
        checkin_obj.concluir()

    return obter_resumo_atendimento(checkin_obj)
