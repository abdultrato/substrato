from services.insurer.authorization_service import AuthorizationService


class RequestAuthorizationUseCase:
    @staticmethod
    def execute(request, plan):
        return AuthorizationService.request(
            request_id=request.id,
            plan=plan,
        )
