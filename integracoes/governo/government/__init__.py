class FHIRService:
    """
    Conversões básicas para padrão FHIR.
    """

    @staticmethod
    def build_observation(patient_id, code, value, unit):
        return {
            "resourceType": "Observation",
            "status": "final",
            "code": {"coding": [{"system": "http://loinc.org", "code": code}]},
            "subject": {"reference": f"Patient/{patient_id}"},
            "valueQuantity": {
                "value": value,
                "unit": unit,
            },
        }

    @staticmethod
    def build_diagnostic_report(patient_id, observations):
        return {
            "resourceType": "DiagnosticReport",
            "status": "final",
            "subject": {"reference": f"Patient/{patient_id}"},
            "result": observations,
        }
