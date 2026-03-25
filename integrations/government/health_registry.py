class HealthRegistry:
    def register_patient(self, patient):
        pass


RegistroSaude = HealthRegistry
HealthRegistry.registrar_patient = HealthRegistry.register_patient
