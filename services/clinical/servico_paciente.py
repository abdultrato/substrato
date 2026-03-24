from apps.clinical.models.patient import Patient
from domain.clinical.regras_paciente import validar_idade


class ServicoPaciente:
    def registrar(self, dados):
        validar_idade(dados["data_nascimento"])
        return Patient.objects.create(**dados)
