from django.conf import settings
import requests

from .adapters import InsuranceProvider


class DefaultInsuranceProvider(InsuranceProvider):
    """
    Provider genérico (mock ou integração simples).
    Pode ser substituído por provedores reais.
    """

    name = "default"

    def check_eligibility(self, patient_id, policy_number, **kwargs):
        response = requests.post(
            settings.INSURANCE_API_URL + "/eligibility",
            json={
                "patient_id": patient_id,
                "policy_number": policy_number,
            },
            headers={"Authorization": f"Bearer {settings.INSURANCE_API_KEY}"},
            timeout=15,
        )

        response.raise_for_status()
        return response.json()

    def authorize_procedure(self, procedure_code, policy_number, **kwargs):
        response = requests.post(
            settings.INSURANCE_API_URL + "/authorize",
            json={
                "procedure_code": procedure_code,
                "policy_number": policy_number,
            },
            headers={"Authorization": f"Bearer {settings.INSURANCE_API_KEY}"},
            timeout=15,
        )

        response.raise_for_status()
        return response.json()

    def submit_claim(self, claim_data):
        response = requests.post(
            settings.INSURANCE_API_URL + "/claims",
            json=claim_data,
            headers={"Authorization": f"Bearer {settings.INSURANCE_API_KEY}"},
            timeout=20,
        )

        response.raise_for_status()
        return response.json()
