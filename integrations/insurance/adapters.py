from django.conf import settings


class InsuranceProvider:
    """
    Interface base para integração com seguradoras.
    """

    name = "base"

    def check_eligibility(self, patient_id, policy_number, **kwargs):
        raise NotImplementedError

    def authorize_procedure(self, procedure_code, policy_number, **kwargs):
        raise NotImplementedError

    def submit_claim(self, claim_data: dict):
        raise NotImplementedError


def get_insurance_provider(provider_name: str | None = None) -> InsuranceProvider:
    """
    Retorna provider configurado.
    """

    provider_name = provider_name or getattr(settings, "DEFAULT_INSURANCE_PROVIDER", "default")

    providers = {
        "default": "viewsets.integrations.insurance.providers.DefaultInsuranceProvider",
    }

    if provider_name not in providers:
        raise ValueError(f"Provider desconhecido: {provider_name}")

    module_path, class_name = providers[provider_name].rsplit(".", 1)
    module = __import__(module_path, fromlist=[class_name])
    return getattr(module, class_name)()
