class HL7Integration:
    def send_result(self, data):
        pass


IntegracaoHL7 = HL7Integration
HL7Integration.enviar_resultado = HL7Integration.send_result
