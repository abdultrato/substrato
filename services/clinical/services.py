from ...apps.clinical.models.patient import Patient


class ClinicalService:
    def register_patient(self, date):
        return Patient.objects.create(**date)

    def update_request_status(self, request, status):
        request.status = status
        request.save()


ServicoClinico = ClinicalService
ClinicalService.registrar_patient = ClinicalService.register_patient
ClinicalService.atualizar_status_request = ClinicalService.update_request_status
