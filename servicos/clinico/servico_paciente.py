from aplicativos.clinico.modelos.paciente import Paciente
from dominio.clinico.regras_paciente import validar_idade


class ServicoPaciente:
    def registrar(self, dados):
        validar_idade(dados["data_nascimento"])
        return Paciente.objects.create(**dados)
