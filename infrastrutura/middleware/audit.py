from observabilidade.audit import registrar_evento


class TenantAuditMiddleware:
    """
    Auditoria multi-tenant.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):

        response = self.get_response(request)

        inquilino = getattr(request, "inquilino", None)

        registrar_evento(
            usuario=getattr(request, "user", None),
            tenant_id=getattr(inquilino, "id", None),
            caminho=request.path,
            metodo=request.method,
            status_code=response.status_code,
        )

        return response
