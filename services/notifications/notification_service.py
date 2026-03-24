from apps.notifications.services import NotificationService


class CommunicationService:
    def notify_result_ready(self, patient):
        if not patient:
            return []

        return NotificationService().send_to_patient(
            patient=patient,
            message="Seu resultado está disponível.",
            subject="Resultado disponível",
        )


ServicoComunicacao = CommunicationService
CommunicationService.avisar_resultado_pronto = CommunicationService.notify_result_ready
