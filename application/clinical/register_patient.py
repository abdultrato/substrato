from services.clinical.patient_service import PatientService


def register_patient(data):
    return PatientService().register(data)


cadastrar_paciente = register_patient
