from __future__ import annotations

from importlib import import_module

_EXPORTS = {
    "AnonBurstRateThrottle": ("security.throttling", "AnonBurstRateThrottle"),
    "AnonRateThrottle": ("security.throttling", "AnonRateThrottle"),
    "AuthRefreshRateThrottle": ("security.throttling", "AuthRefreshRateThrottle"),
    "BurstRateThrottle": ("security.throttling", "BurstRateThrottle"),
    "JWTAuth": ("security.authenticacao", "JWTAuth"),
    "LoginRateThrottle": ("security.throttling", "LoginRateThrottle"),
    "PasswordResetConfirmRateThrottle": ("security.throttling", "PasswordResetConfirmRateThrottle"),
    "PasswordResetRequestRateThrottle": ("security.throttling", "PasswordResetRequestRateThrottle"),
    "SignupRateThrottle": ("security.throttling", "SignupRateThrottle"),
    "SustainedRateThrottle": ("security.throttling", "SustainedRateThrottle"),
    "TenantScopedThrottleMixin": ("security.throttling", "TenantScopedThrottleMixin"),
    "UserRateThrottle": ("security.throttling", "UserRateThrottle"),
    "WebhookRateThrottle": ("security.throttling", "WebhookRateThrottle"),
    "anonimizar_email": ("security.anonymize", "anonimizar_email"),
    "criptografar": ("security.cryptography_utils", "criptografar"),
    "descriptografar": ("security.cryptography_utils", "descriptografar"),
    "gerar_hash": ("security.secure_hash", "gerar_hash"),
    "limpar_texto": ("security.sanitization", "limpar_texto"),
    "permitido": ("security.rate_limit", "permitido"),
    "registrar_acao": ("security.audit", "registrar_acao"),
    "user_pode_acessar": ("security.access_control", "user_pode_acessar"),
}

__all__ = sorted([*_EXPORTS, "throttling"])


def __getattr__(name: str):
    if name == "throttling":
        module = import_module("security.throttling")
        globals()[name] = module
        return module

    try:
        module_name, attr_name = _EXPORTS[name]
    except KeyError as error:
        raise AttributeError(f"module 'security' has no attribute {name!r}") from error

    value = getattr(import_module(module_name), attr_name)
    globals()[name] = value
    return value
"""Utilidades e integrações de segurança (auth, ACL, crypto, rate limiting)."""
