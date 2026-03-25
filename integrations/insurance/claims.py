from .adapters import get_insurance_provider


class ClaimService:
    """
    Orquestra submissão de sinistros.
    """

    def __init__(self, provider=None):
        self.provider = get_insurance_provider(provider)

    def submit(self, patient, procedures, total_amount, policy_number):
        claim_date = {
            "patient": {
                "id": patient.id,
                "name": getattr(patient, "name", ""),
            },
            "procedures": procedures,
            "total_amount": float(total_amount),
            "policy_number": policy_number,
        }

        return self.provider.submit_claim(claim_date)
