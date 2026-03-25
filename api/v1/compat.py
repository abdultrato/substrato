from __future__ import annotations

from collections.abc import Mapping


def normalize_legacy_input(data, aliases: dict[str, str]):
    if not aliases or not isinstance(data, Mapping):
        return data

    normalized = data.copy() if hasattr(data, "copy") else dict(data)
    for legacy_name, canonical_name in aliases.items():
        if canonical_name not in normalized and legacy_name in normalized:
            normalized[canonical_name] = normalized[legacy_name]
    return normalized


def append_legacy_aliases(data, aliases: dict[str, str]):
    if not aliases or not isinstance(data, Mapping):
        return data

    represented = dict(data)
    for legacy_name, canonical_name in aliases.items():
        if canonical_name in represented and legacy_name not in represented:
            represented[legacy_name] = represented[canonical_name]
    return represented


class LegacyAliasSerializerMixin:
    legacy_input_aliases: dict[str, str] = {}
    legacy_output_aliases: dict[str, str] = {}

    def to_internal_value(self, data):
        normalized = normalize_legacy_input(data, self.legacy_input_aliases)
        return super().to_internal_value(normalized)

    def to_representation(self, instance):
        data = super().to_representation(instance)
        return append_legacy_aliases(data, self.legacy_output_aliases)
