from __future__ import annotations

import ast
from datetime import UTC
import importlib.util
import pkgutil


def _patch_legacy_ast_aliases() -> None:
    # Pytest/plugins antigos ainda referenciam aliases removidos no Python 3.14.
    legacy_aliases = {
        "Str": ast.Constant,
        "Bytes": ast.Constant,
        "Num": ast.Constant,
        "NameConstant": ast.Constant,
        "Ellipsis": ast.Constant,
    }
    for name, target in legacy_aliases.items():
        if not hasattr(ast, name):
            setattr(ast, name, target)

    if not hasattr(ast.Constant, "s"):
        ast.Constant.s = property(lambda self: self.value)
    if not hasattr(ast.Constant, "n"):
        ast.Constant.n = property(lambda self: self.value)


def _patch_pkgutil_find_loader() -> None:
    if hasattr(pkgutil, "find_loader"):
        return

    def find_loader(name: str):
        spec = importlib.util.find_spec(name)
        return None if spec is None else spec.loader

    pkgutil.find_loader = find_loader


def _patch_django_timezone_utc() -> None:
    try:
        from django.utils import timezone as django_timezone
    except Exception:
        return

    if not hasattr(django_timezone, "utc"):
        django_timezone.utc = UTC


def _patch_django_filters_choice_iterator() -> None:
    try:
        from django import forms
        import django_filters.fields as django_filter_fields
    except Exception:
        return

    if hasattr(forms.ChoiceField, "_get_choices") and hasattr(forms.ChoiceField, "_set_choices"):
        return

    mixin = django_filter_fields.ChoiceIteratorMixin
    if getattr(mixin, "_substrato_choice_compat", False):
        return

    getter = getattr(forms.ChoiceField.choices, "fget", None)
    setter = getattr(forms.ChoiceField.choices, "fset", None)
    if getter is None or setter is None:
        return

    def _get_choices(self):
        if hasattr(self, "_choices"):
            return self._choices

        queryset = getattr(self, "queryset", None)
        if queryset is not None:
            return self.iterator(self)

        return getter(self)

    def _set_choices(self, value):
        setter(self, value)
        choices = self.iterator(self, self._choices)
        self._choices = self.widget.choices = choices

    mixin._get_choices = _get_choices
    mixin._set_choices = _set_choices
    mixin.choices = property(_get_choices, _set_choices)
    mixin._substrato_choice_compat = True


_patch_legacy_ast_aliases()
_patch_pkgutil_find_loader()
_patch_django_timezone_utc()
_patch_django_filters_choice_iterator()
