from __future__ import annotations

from django.conf import settings
from django.http import HttpResponseBadRequest
from django.http.request import split_domain_port, validate_host


class TrustedHostMiddleware:
    """Reject untrusted Host headers before Django renders DEBUG error pages."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        host = self._raw_host(request)
        domain, _port = split_domain_port(host)
        if not domain or not validate_host(domain, self._allowed_hosts()):
            return HttpResponseBadRequest("Bad Request: invalid Host header.")
        return self.get_response(request)

    @staticmethod
    def _raw_host(request) -> str:
        if getattr(settings, "USE_X_FORWARDED_HOST", False):
            forwarded_host = request.META.get("HTTP_X_FORWARDED_HOST")
            if forwarded_host:
                return forwarded_host.split(",", 1)[0].strip()

        host = request.META.get("HTTP_HOST")
        if host:
            return host

        server_name = request.META.get("SERVER_NAME", "")
        server_port = request.META.get("SERVER_PORT", "")
        return f"{server_name}:{server_port}" if server_port else server_name

    @staticmethod
    def _allowed_hosts() -> list[str]:
        allowed_hosts = list(getattr(settings, "ALLOWED_HOSTS", []) or [])
        if allowed_hosts:
            return allowed_hosts
        if getattr(settings, "DEBUG", False):
            return [".localhost", "127.0.0.1", "[::1]"]
        return allowed_hosts
