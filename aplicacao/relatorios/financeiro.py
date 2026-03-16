from frontend.billing.models import HistoricoFinanceiro


def registrar_evento_financeiro(
    *,
    fatura,
    tipo_evento,
    descricao: str,
    valor: float | None = None,
    referencia_externa: str = "",
    usuario=None,
    origem="sistema",
    ip=None,
):
    HistoricoFinanceiro.objects.create(
        fatura=fatura,
        tipo_evento=tipo_evento,
        descricao=descricao,
        valor=valor,
        referencia_externa=referencia_externa,
        usuario=usuario,
        origem=origem,
        ip_origem=ip,
    )
