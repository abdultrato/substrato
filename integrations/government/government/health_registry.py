from django.conf import settings
import requests


class HealthRegistryService:
    """
    Integração com Registo Nacional de Saúde.

    Permite:
    ✔ validação de pacientes
    ✔ sincronização de dados
    ✔ verificação de elegibilidade
    """

    base_url = getattr(settings, "HEALTH_REGISTRY_URL", "")
    api_key = getattr(settings, "HEALTH_REGISTRY_KEY", "")

    def _headers(self):
        return {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

    def find_patient(self, document_number: str):
        """
        Consulta patient no sistema nacional.
        """
        response = requests.get(
            f"{self.base_url}/patients",
            params={"document": document_number},
            headers=self._headers(),
            timeout=15,
        )

        if response.status_code == 404:
            return None

        response.raise_for_status()
        return response.json()

    def verify_eligibility(self, patient_id: str):
        """
        Verifica elegibilidade para serviços públicos.
        """
        response = requests.get(
            f"{self.base_url}/eligibility/{patient_id}",
            headers=self._headers(),
            timeout=15,
        )

        response.raise_for_status()
        return response.json()

    def sync_patient(self, patient_date: dict):
        """
        Sincroniza patient com base nacional.
        """
        response = requests.post(
            f"{self.base_url}/patients",
            json=patient_date,
            headers=self._headers(),
            timeout=20,
        )

        response.raise_for_status()
        return response.json()
