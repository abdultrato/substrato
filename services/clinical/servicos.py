from ...apps.clinical.models.patient import Patient


class ServicoClinico:
    def registrar_paciente(self, dados):
        return Patient.objects.create(**dados)

    def atualizar_status_requisicao(self, requisicao, status):
        requisicao.status = status
        requisicao.save()
