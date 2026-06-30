"""Tratamento global de IntegrityError no Django Admin.

Este módulo instala um guard para evitar erro 500 em operações de escrita
no admin quando a BD rejeita a gravação por restrições de integridade.
"""

from __future__ import annotations

from functools import wraps
import logging
import re

from django.contrib import messages
from django.contrib.admin.options import ModelAdmin
from django.db import IntegrityError
from django.http import HttpResponseRedirect

logger = logging.getLogger(__name__)

_PATCH_FLAG = "_substrato_integrity_guard_installed"

_NOT_NULL_RE = re.compile(r"NOT NULL constraint failed:\s*([A-Za-z0-9_]+\.)?([A-Za-z0-9_]+)")
_UNIQUE_RE = re.compile(r"UNIQUE constraint failed:\s*(.+)")
_FK_RE = re.compile(r"FOREIGN KEY constraint failed")


def _is_write_request(request) -> bool:
    return request.method in {"POST", "PUT", "PATCH", "DELETE"}


def _extract_integrity_hint(exc: IntegrityError) -> str:
    raw = (str(exc) or "").strip()
    if not raw:
        return "A base de dados rejeitou a operação por uma restrição de integridade."

    match = _NOT_NULL_RE.search(raw)
    if match:
        field_name = (match.group(2) or "").strip()
        if field_name.endswith("_id"):
            field_name = field_name[:-3]
        if field_name:
            return f"O campo obrigatório '{field_name}' não foi preenchido."
        return "Existe um campo obrigatório em falta."

    match = _UNIQUE_RE.search(raw)
    if match:
        return "Já existe um registo com estes dados únicos."

    if _FK_RE.search(raw):
        return "Existe uma referência inválida para outro registo."

    return raw


def _build_user_message(exc: IntegrityError) -> str:
    hint = _extract_integrity_hint(exc)
    return (
        "Não foi possível guardar porque a operação violou uma regra de integridade da base de dados. "
        f"{hint}"
    )


def _redirect_to_current_page(request):
    target = request.get_full_path() or request.path or "/admin/"
    return HttpResponseRedirect(target)


def _patch_admin_site_check() -> None:
    """Fix race condition in Django admin check() when autoreloader is active.

    Django's AdminSite.check() iterates self._registry.values() without taking
    a snapshot, which raises RuntimeError if another thread registers a model
    concurrently (common with Python 3.13 autoreloader). Wrapping check() to
    temporarily replace _registry with a snapshot dict is safe because all
    registrations are complete before any request is served.
    """
    from django.contrib.admin import sites as _sites

    _AdminSite = _sites.AdminSite
    _original_check = _AdminSite.check

    def _safe_check(self, app_configs):
        original_registry = self._registry
        self._registry = dict(original_registry)
        try:
            return _original_check(self, app_configs)
        finally:
            self._registry = original_registry

    _AdminSite.check = _safe_check


def install_admin_integrity_guard() -> None:
    """Instala wrappers de proteção no ModelAdmin uma única vez."""
    if getattr(ModelAdmin, _PATCH_FLAG, False):
        return

    _patch_admin_site_check()

    original_changeform_view = ModelAdmin.changeform_view
    original_changelist_view = ModelAdmin.changelist_view

    @wraps(original_changeform_view)
    def guarded_changeform_view(self, request, object_id=None, form_url="", extra_context=None):
        try:
            return original_changeform_view(
                self,
                request,
                object_id=object_id,
                form_url=form_url,
                extra_context=extra_context,
            )
        except IntegrityError as exc:
            if not _is_write_request(request):
                raise
            logger.warning(
                "IntegrityError no admin changeform (%s.%s): %s",
                self.model._meta.app_label,
                self.model._meta.model_name,
                exc,
            )
            self.message_user(request, _build_user_message(exc), level=messages.ERROR)
            return _redirect_to_current_page(request)

    @wraps(original_changelist_view)
    def guarded_changelist_view(self, request, extra_context=None):
        try:
            return original_changelist_view(self, request, extra_context=extra_context)
        except IntegrityError as exc:
            if not _is_write_request(request):
                raise
            logger.warning(
                "IntegrityError no admin changelist (%s.%s): %s",
                self.model._meta.app_label,
                self.model._meta.model_name,
                exc,
            )
            self.message_user(request, _build_user_message(exc), level=messages.ERROR)
            return _redirect_to_current_page(request)

    ModelAdmin.changeform_view = guarded_changeform_view
    ModelAdmin.changelist_view = guarded_changelist_view
    setattr(ModelAdmin, _PATCH_FLAG, True)

