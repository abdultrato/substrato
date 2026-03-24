from ...apps.clinical.models.patient import Patient


class ClinicalService:
    def register_patient(self, data):
        return Patient.objects.create(**data)

    def update_request_status(self, request, status):
        request.status = status
        request.save()


ServicoClinico = ClinicalService
ClinicalService.registrar_paciente = ClinicalService.register_patient
ClinicalService.atualizar_status_requisicao = ClinicalService.update_request_status
