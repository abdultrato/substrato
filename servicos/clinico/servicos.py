from ...aplicativos.clinico.modelos.paciente import Paciente


class ServicoClinico:
    def registrar_paciente(self, dados):
        return Paciente.objects.create(**dados)

    def atualizar_status_requisicao(self, requisicao, status):
        requisicao.status = status
        requisicao.save()
