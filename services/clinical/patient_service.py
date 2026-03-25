from apps.clinical.models.patient import Patient
from domain.clinical.patient_rules import validate_age


class PatientService:
    def register(self, date):
        validate_age(date["birth_date"])
        return Patient.objects.create(**date)


ServicoPaciente = PatientService
PatientService.registrar = PatientService.register
