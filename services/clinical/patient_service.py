from apps.clinical.models.patient import Patient
from domain.clinical.regras_paciente import validar_idade


class PatientService:
    def register(self, data):
        validar_idade(data["data_nascimento"])
        return Patient.objects.create(**data)


ServicoPaciente = PatientService
PatientService.registrar = PatientService.register
