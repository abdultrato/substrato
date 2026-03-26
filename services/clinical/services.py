from apps.clinical.models.patient import Patient


class ClinicalService:
    def register_patient(self, data):
        return Patient.objects.create(**data)

    def update_request_status(self, request, status):
        request.status = status
        request.save()
