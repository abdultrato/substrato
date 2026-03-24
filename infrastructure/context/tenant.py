from __future__ import annotations

from contextvars import ContextVar

_tenant_ctx: ContextVar = ContextVar("tenant", default=None)


def set_tenant(tenant):
    """
    Store the current tenant in the request context.
    """
    return _tenant_ctx.set(tenant)


def get_tenant():
    """
    Return the current tenant from the request context.
    """
    return _tenant_ctx.get()


def reset_tenant(token):
    """
    Restore the previous tenant context using a ContextVar token.
    """
    _tenant_ctx.reset(token)


def clear_tenant():
    """
    Explicitly clear the tenant from the current context.
    """
    _tenant_ctx.set(None)


set_inquilino = set_tenant
get_inquilino = get_tenant
reset_inquilino = reset_tenant
clear_inquilino = clear_tenant
