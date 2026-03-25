class AuthorizationService:
    @staticmethod
    def requires_authorization(plan):
        return plan.requires_authorization


ServicoAutorizacao = AuthorizationService
AuthorizationService.necessita_autorizacao = AuthorizationService.requires_authorization
