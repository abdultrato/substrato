class HL7Integration:
    def send_result(self, date):
        pass


IntegracaoHL7 = HL7Integration
HL7Integration.enviar_result = HL7Integration.send_result
