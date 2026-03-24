class HealthRegistry:
    def register_patient(self, patient):
        pass


RegistroSaude = HealthRegistry
HealthRegistry.registrar_paciente = HealthRegistry.register_patient
