from apps.notifications.services import NotificationService


class CommunicationService:
    def notify_result_ready(self, patient):
        if not patient:
            return []

        return NotificationService().send_to_patient(
            patient=patient,
            message="Seu result está disponível.",
            subject="Resultado disponível",
        )


