class AuthorizationService:
    @staticmethod
    def requires_authorization(plan):
        return plan.exige_autorizacao


ServicoAutorizacao = AuthorizationService
AuthorizationService.necessita_autorizacao = AuthorizationService.requires_authorization
