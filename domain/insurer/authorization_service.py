"""Serviço fino para verificar se um plano requer autorização."""

class AuthorizationService:
    @staticmethod
    def requires_authorization(plan):
        return plan.requires_authorization


