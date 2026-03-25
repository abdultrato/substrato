from django.conf import settings
import requests


class TaxAuthorityService:
    """
    Integração com Autoridade Tributária.

    Permite:
    ✔ comunicação de faturas
    ✔ validação fiscal
    ✔ envio de documentos
    """

    base_url = getattr(settings, "TAX_API_URL", "")
    api_key = getattr(settings, "TAX_API_KEY", "")

    def _headers(self):
        return {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

    def submit_invoice(self, invoice_date: dict):
        """
        Submete invoice para autoridade tributária.
        """
        response = requests.post(
            f"{self.base_url}/invoices",
            json=invoice_date,
            headers=self._headers(),
            timeout=30,
        )

        response.raise_for_status()
        return response.json()

    def validate_nuit(self, nuit: str):
        """
        Valida NUIT/NIF no sistema fiscal.
        """
        response = requests.get(
            f"{self.base_url}/taxpayers/{nuit}",
            headers=self._headers(),
            timeout=15,
        )

        if response.status_code == 404:
            return None

        response.raise_for_status()
        return response.json()

    def cancel_invoice(self, invoice_number: str, reason: str):
        """
        Comunicação de anulação.
        """
        response = requests.post(
            f"{self.base_url}/invoices/{invoice_number}/cancel",
            json={"reason": reason},
            headers=self._headers(),
            timeout=20,
        )

        response.raise_for_status()
        return response.json()
