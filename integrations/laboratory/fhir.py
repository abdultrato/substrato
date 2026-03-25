class FHIRIntegration:
    def send_patient(self, patient):
        pass


IntegracaoFHIR = FHIRIntegration
FHIRIntegration.enviar_patient = FHIRIntegration.send_patient
