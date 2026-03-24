from apps.notifications.services import ServicoNotificacao


class ServicoComunicacao:
    def avisar_resultado_pronto(self, paciente):
        if paciente.email:
            ServicoNotificacao().enviar(paciente.email, "Seu resultado está disponível.", "email")
