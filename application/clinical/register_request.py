from application.insurer.request_authorization import RequestAuthorizationUseCase


def register_request(request, patient):
    """
    Dispara solicitação de autorização junto à insurer quando o patient possui cobertura.
    """
    plan = getattr(patient, "coverage_plan", None)
    if plan:
        RequestAuthorizationUseCase.execute(
            request=request,
            plan=plan,
        )


__all__ = ["register_request"]
