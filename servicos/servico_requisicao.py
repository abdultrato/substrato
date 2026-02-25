from aplicativos.clinico.modelos.requisicao_exame import RequisicaoExame

class ServicoRequisicao:

    def criar(self, paciente, medico):
        return RequisicaoExame.objects.create(
            paciente=paciente,
            medico_solicitante=medico
        )
