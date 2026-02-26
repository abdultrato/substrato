from aplicativos.clinico.modelos.paciente import Paciente
from dominio.clinico.regras_paciente import validar_idade

class ServicoPaciente:

    def registrar(self, dados):
        idade = validar_idade(dados["data_nascimento"])
        paciente = Paciente.objects.create(**dados)
        return paciente
