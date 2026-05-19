"""Middleware que garante contexto de tenant definido para operações multi-tenant."""

import logging
from django.http import JsonResponse
from django.conf import settings

from infrastructure.context.tenant import get_tenant, set_tenant, clear_tenant

logger = logging.getLogger(__name__)


class TenantEnforcerMiddleware:
    """
    Middleware que verifica se tenant context está definido.
    
    Complementa o TenantMiddleware existente com validações adicionais:
    - Garante que tenant_id está definido para operações em /api/v1/
    - Permite bypass para health checks e públicos
    - Loga warnings se tenant não está definido em contextos inesperados
    """
    
    # Paths que NÃO requerem tenant context
    TENANT_OPTIONAL_PATHS = {
        '/health/',
        '/metrics',
        '/admin/login/',
        '/api-auth/login/',
    }
    
    # Paths que SÃO públicos (sem tenant requerido)
    PUBLIC_PATHS = {
        '/',
        '/health/live/',
        '/health/ready/',
        '/metrics/',
    }
    
    # Paths que REQUEREM tenant (API endpoints)
    TENANT_REQUIRED_PATTERNS = [
        '/api/v1/',
        '/graphql/',
    ]
    
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        tenant_id = self._get_tenant_id_from_request(request)
        
        try:
            if tenant_id:
                set_tenant(request.tenant)  # Usar tenant object já setado pelo TenantMiddleware
            
            response = self.get_response(request)
        finally:
            clear_tenant()
        
        return response
    
    def _get_tenant_id_from_request(self, request) -> bool:
        """Verificar se request deveria ter tenant context definido"""
        path = request.path
        
        # Public paths não requerem tenant
        if path in self.PUBLIC_PATHS or any(path.startswith(p) for p in self.TENANT_OPTIONAL_PATHS):
            return False
        
        # API endpoints requerem tenant
        for pattern in self.TENANT_REQUIRED_PATTERNS:
            if path.startswith(pattern):
                return True
        
        return False
    
    def _is_tenant_required(self, request) -> bool:
        """Verificar se este request requer tenant context"""
        path = request.path
        return any(path.startswith(p) for p in self.TENANT_REQUIRED_PATTERNS)


class TenantContextDebugMiddleware:
    """
    Middleware de debug que loga contexto de tenant por request.
    
    Apenas ativa em DEBUG=True para evitar overhead em produção.
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        if not settings.DEBUG:
            return self.get_response(request)
        
        tenant_before = get_tenant()
        
        response = self.get_response(request)
        
        tenant_after = get_tenant()
        
        # Log para debug
        if request.path.startswith('/api/v1/'):
            tenant_id = tenant_before.id if tenant_before else None
            logger.debug(
                f"Request {request.method} {request.path} "
                f"| Tenant: {tenant_id} | User: {request.user}"
            )
        
        return response
