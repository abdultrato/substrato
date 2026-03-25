class AuthorizationService:
    @staticmethod
    def requires_authorization(plan):
        return plan.requires_authorization


