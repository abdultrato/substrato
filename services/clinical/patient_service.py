from apps.clinical.models.patient import Patient
from domain.clinical.patient_rules import validate_age


class PatientService:
    def register(self, data):
        validate_age(data["data_nascimento"])
        return Patient.objects.create(**data)


ServicoPaciente = PatientService
PatientService.registrar = PatientService.register
