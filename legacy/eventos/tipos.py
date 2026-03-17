class Evento:
    pass


class PacienteRegistrado(Evento):
    def __init__(self, paciente_id):
        self.paciente_id = paciente_id


class ResultadoLiberado(Evento):
    def __init__(self, resultado_id):
        self.resultado_id = resultado_id


class PagamentoConfirmado(Evento):
    def __init__(self, pagamento_id):
        self.pagamento_id = pagamento_id


class FaturaEmitida(Evento):
    def __init__(self, fatura_id):
        self.fatura_id = fatura_id
