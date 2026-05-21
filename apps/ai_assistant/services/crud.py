from __future__ import annotations

import json
import re
from dataclasses import dataclass
from typing import Any

from django.apps import apps as django_apps
from django.core.exceptions import FieldDoesNotExist
from django.db.models import Q
from django.utils import timezone
from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework.fields import empty
from rest_framework.test import APIRequestFactory, force_authenticate

from apps.ai_assistant.models import AiSession, AiSuggestedAction
from apps.ai_assistant.services.policy import AiPolicyGuard
from apps.ai_assistant.tools.resource_catalog import (
    ResourceDescriptor,
    descriptor_by_basename,
    get_resource_descriptors,
    match_resource_descriptors,
    scoped_queryset_for_resource,
    user_can_method_resource,
    viewset_for_descriptor,
)


CRUD_DRAFT_KEY = "crud_draft"
CORE_READ_ONLY_FIELDS = {
    "id",
    "pk",
    "tenant",
    "custom_id",
    "created_at",
    "updated_at",
    "deleted",
    "deleted_at",
    "deleted_by",
    "created_by",
    "updated_by",
    "version",
}
CREATE_TERMS = (
    "criar",
    "crie",
    "inserir",
    "insira",
    "cadastrar",
    "cadastre",
    "registar",
    "registe",
    "registrar",
    "adicione",
    "adicionar",
    "novo",
    "nova",
    "create",
    "insert",
    "add",
    "register",
)
UPDATE_TERMS = (
    "actualizar",
    "atualizar",
    "actualize",
    "atualize",
    "alterar",
    "altere",
    "editar",
    "edite",
    "corrigir",
    "corrija",
    "mudar",
    "mude",
    "update",
    "edit",
    "change",
)
DELETE_TERMS = (
    "apagar",
    "apague",
    "remover",
    "remova",
    "eliminar",
    "elimine",
    "excluir",
    "exclua",
    "delete",
    "remove",
)
RESOURCE_METHOD_BLOCKLIST = {
    # Estes recursos têm transições próprias no domínio. A IA pode consultar e,
    # quando permitido, alterar campos seguros, mas não deve preparar operações
    # que os próprios ViewSets rejeitam como manuais.
    "bloodbank-armazenamento": frozenset({"POST", "PUT", "PATCH", "DELETE"}),
    "bloodbank-unidade": frozenset({"POST", "DELETE"}),
    "bloodbank-movimentoestoque": frozenset({"POST", "PUT", "PATCH", "DELETE"}),
    # Clinical request items and results are generated/advanced by domain
    # workflows. Direct CRUD would bypass result creation and validation states.
    "clinical-labrequestitem": frozenset({"POST", "PUT", "PATCH", "DELETE"}),
    "clinical-resultitem": frozenset({"POST", "PUT", "PATCH", "DELETE"}),
    # File uploads need multipart/user-selected binary content, not chat payloads.
    "clinical-medicalresultfile": frozenset({"POST"}),
}
RELATED_LOOKUP_FIELDS = (
    "custom_id",
    "code",
    "codigo",
    "number",
    "unit_number",
    "bag_identifier",
    "student_code",
    "teacher_code",
    "name",
    "username",
    "email",
)


@dataclass(slots=True)
class CrudFieldSpec:
    name: str
    label: str
    required: bool
    field_type: str
    aliases: tuple[str, ...]
    choices: tuple[tuple[str, str], ...] = ()
    related_app_label: str = ""
    related_model_name: str = ""

    @property
    def terms(self) -> tuple[str, ...]:
        alias_terms = {alias.replace("_", " ") for alias in self.aliases}
        values = {self.name, self.name.replace("_", " "), self.label, *self.aliases, *alias_terms}
        return tuple(sorted({value.strip() for value in values if value and value.strip()}, key=len, reverse=True))


class AiCrudConversationManager:
    """Prepara CRUD conversacional usando o catálogo real da API e RBAC."""

    def prepare(
        self,
        *,
        tenant,
        user,
        session: AiSession,
        message: str,
        language: str,
    ) -> dict[str, Any]:
        message = message or ""
        language = "en" if language == "en" else "pt"
        draft = self._active_draft(session)
        operation = self._detect_operation(message) or str((draft or {}).get("operation") or "")
        if operation not in {"create", "update", "delete"}:
            return self._no_intent(language=language)

        descriptor = self._resolve_descriptor(message=message, draft=draft)
        if descriptor is None:
            self._save_draft(session, {"operation": operation, "payload": {}, "object_ref": ""})
            return self._needs_resource(operation=operation, language=language)

        method = self._method_for_operation(operation)
        if not user_can_method_resource(user=user, basename=descriptor.basename, method=method):
            self._clear_draft(session)
            return self._access_denied(descriptor=descriptor, method=method, language=language)
        if not self._method_available_for_resource(descriptor=descriptor, method=method):
            self._clear_draft(session)
            return self._operation_unavailable(
                descriptor=descriptor,
                method=method,
                operation=operation,
                language=language,
            )

        field_specs = self._field_specs(descriptor=descriptor, tenant=tenant, user=user, operation=operation)
        extracted_payload = self._extract_payload(message=message, field_specs=field_specs, descriptor=descriptor)
        extracted_payload = self._resolve_related_values(payload=extracted_payload, field_specs=field_specs, tenant=tenant)
        object_ref = self._extract_object_ref(message) or str((draft or {}).get("object_ref") or "")

        previous_payload = {}
        if draft and draft.get("resource_basename") == descriptor.basename and draft.get("operation") == operation:
            previous_payload = dict(draft.get("payload") or {})
        payload = {**previous_payload, **extracted_payload}

        missing_fields = self._missing_required_fields(operation=operation, payload=payload, field_specs=field_specs)
        if operation == "create" and missing_fields:
            self._save_draft(
                session,
                {
                    "operation": operation,
                    "resource_basename": descriptor.basename,
                    "payload": payload,
                    "object_ref": "",
                    "missing_fields": [field.name for field in missing_fields],
                },
            )
            return self._collecting_result(
                operation=operation,
                descriptor=descriptor,
                payload=payload,
                missing_fields=missing_fields,
                field_specs=field_specs,
                language=language,
            )

        if operation == "update" and (not object_ref or not payload):
            self._save_draft(
                session,
                {
                    "operation": operation,
                    "resource_basename": descriptor.basename,
                    "payload": payload,
                    "object_ref": object_ref,
                    "missing_fields": ["object_ref"] if not object_ref else ["fields"],
                },
            )
            return self._collecting_result(
                operation=operation,
                descriptor=descriptor,
                payload=payload,
                missing_fields=[],
                field_specs=field_specs,
                language=language,
                object_ref=object_ref,
                needs_object_ref=not object_ref,
                needs_fields=not payload,
            )

        if operation == "delete" and not object_ref:
            self._save_draft(
                session,
                {
                    "operation": operation,
                    "resource_basename": descriptor.basename,
                    "payload": {},
                    "object_ref": "",
                    "missing_fields": ["object_ref"],
                },
            )
            return self._collecting_result(
                operation=operation,
                descriptor=descriptor,
                payload={},
                missing_fields=[],
                field_specs=field_specs,
                language=language,
                needs_object_ref=True,
            )

        self._clear_draft(session)
        return self._ready_result(
            operation=operation,
            descriptor=descriptor,
            payload=payload,
            object_ref=object_ref,
            field_specs=field_specs,
            user=user,
            language=language,
        )

    def _active_draft(self, session: AiSession) -> dict[str, Any] | None:
        metadata = session.metadata or {}
        draft = metadata.get(CRUD_DRAFT_KEY)
        return draft if isinstance(draft, dict) else None

    def _save_draft(self, session: AiSession, draft: dict[str, Any]) -> None:
        metadata = dict(session.metadata or {})
        metadata[CRUD_DRAFT_KEY] = {**draft, "updated_at": timezone.now().isoformat()}
        session.metadata = metadata
        session.save(update_fields=["metadata", "updated_at"])

    def _clear_draft(self, session: AiSession) -> None:
        metadata = dict(session.metadata or {})
        if CRUD_DRAFT_KEY not in metadata:
            return
        metadata.pop(CRUD_DRAFT_KEY, None)
        session.metadata = metadata
        session.save(update_fields=["metadata", "updated_at"])

    def _detect_operation(self, message: str) -> str:
        normalized = self._normalize(message)
        if any(re.search(rf"\b{re.escape(term)}\b", normalized) for term in DELETE_TERMS):
            return "delete"
        if any(re.search(rf"\b{re.escape(term)}\b", normalized) for term in UPDATE_TERMS):
            return "update"
        if any(re.search(rf"\b{re.escape(term)}\b", normalized) for term in CREATE_TERMS):
            return "create"
        return ""

    def _resolve_descriptor(self, *, message: str, draft: dict[str, Any] | None) -> ResourceDescriptor | None:
        direct_descriptor = self._descriptor_from_operation_target(message)
        if direct_descriptor is not None:
            return direct_descriptor

        matches = match_resource_descriptors(message, limit=4)
        if matches:
            return matches[0]
        basename = str((draft or {}).get("resource_basename") or "")
        return descriptor_by_basename(basename)

    def _descriptor_from_operation_target(self, message: str) -> ResourceDescriptor | None:
        normalized = self._normalize(message or "")
        if not normalized:
            return None

        operation_terms = sorted(
            {self._normalize(term) for term in (*CREATE_TERMS, *UPDATE_TERMS, *DELETE_TERMS)},
            key=len,
            reverse=True,
        )
        terms_pattern = "|".join(re.escape(term) for term in operation_terms if term)
        match = re.search(rf"(?<!\w)(?:{terms_pattern})(?!\w)\s+(?P<target>.+)$", normalized)
        if not match:
            return None

        target = match.group("target").strip()
        target = re.sub(
            r"^(?:(?:um|uma|o|a|os|as|novo|nova|novos|novas|registo|registro)\s+)+",
            "",
            target,
        )
        if not target:
            return None

        candidates: list[tuple[int, ResourceDescriptor]] = []
        for descriptor in get_resource_descriptors():
            for keyword in descriptor.keywords:
                if len(keyword) < 3:
                    continue
                if re.match(rf"{re.escape(keyword)}(?!\w)", target):
                    score = len(keyword) + (20 if " " in keyword else 0)
                    candidates.append((score, descriptor))
                    break

        if not candidates:
            return None
        candidates.sort(key=lambda item: (-item[0], item[1].label_pt, item[1].basename))
        return candidates[0][1]

    def _method_for_operation(self, operation: str) -> str:
        return {"create": "POST", "update": "PATCH", "delete": "DELETE"}[operation]

    def _method_available_for_resource(self, *, descriptor: ResourceDescriptor, method: str) -> bool:
        blocked = RESOURCE_METHOD_BLOCKLIST.get(descriptor.basename, frozenset())
        return method.upper() not in blocked

    def _field_specs(self, *, descriptor: ResourceDescriptor, tenant, user, operation: str) -> list[CrudFieldSpec]:
        viewset_class = viewset_for_descriptor(descriptor)
        serializer_class = getattr(viewset_class, "serializer_class", None) if viewset_class else None
        if serializer_class is None:
            try:
                viewset = viewset_class()
                viewset.action = "create" if operation == "create" else "partial_update"
                serializer_class = viewset.get_serializer_class()
            except Exception:
                serializer_class = None
        if serializer_class is None:
            return []

        try:
            serializer = serializer_class(context={"request": _ContextRequest(user=user, tenant=tenant)})
            fields = serializer.fields
        except Exception:
            return []

        model = getattr(getattr(serializer_class, "Meta", None), "model", None)
        legacy_aliases = getattr(serializer_class, "legacy_input_aliases", {}) or {}
        by_canonical: dict[str, list[str]] = {}
        for legacy_name, canonical_name in legacy_aliases.items():
            by_canonical.setdefault(str(canonical_name), []).append(str(legacy_name))

        specs: list[CrudFieldSpec] = []
        for name, field in fields.items():
            if name in CORE_READ_ONLY_FIELDS or getattr(field, "read_only", False):
                continue
            if getattr(field, "source", None) == "*":
                continue
            label = self._field_label(model=model, field_name=name, fallback=str(getattr(field, "label", "") or name))
            choices = tuple((str(key), str(value)) for key, value in (getattr(field, "choices", {}) or {}).items())
            required = bool(getattr(field, "required", False)) and getattr(field, "default", empty) is empty
            related_queryset = getattr(field, "queryset", None)
            child_relation = getattr(field, "child_relation", None)
            if related_queryset is None and child_relation is not None:
                related_queryset = getattr(child_relation, "queryset", None)
            related_model = getattr(related_queryset, "model", None)
            specs.append(
                CrudFieldSpec(
                    name=name,
                    label=label,
                    required=required,
                    field_type=field.__class__.__name__,
                    aliases=tuple(by_canonical.get(name, ())),
                    choices=choices,
                    related_app_label=getattr(getattr(related_model, "_meta", None), "app_label", "") if related_model else "",
                    related_model_name=getattr(related_model, "__name__", "") if related_model else "",
                )
            )
        return specs

    def _field_label(self, *, model, field_name: str, fallback: str) -> str:
        if model is None:
            return fallback.replace("_", " ").title()
        try:
            field = model._meta.get_field(field_name)
            return str(getattr(field, "verbose_name", "") or fallback).replace("_", " ").title()
        except (FieldDoesNotExist, Exception):
            return fallback.replace("_", " ").title()

    def _extract_payload(
        self,
        *,
        message: str,
        field_specs: list[CrudFieldSpec],
        descriptor: ResourceDescriptor,
    ) -> dict[str, Any]:
        payload: dict[str, Any] = {}
        payload.update(self._extract_json_payload(message=message, field_specs=field_specs))
        payload.update(self._extract_key_value_payload(message=message, field_specs=field_specs))
        self._extract_common_payload(message=message, field_specs=field_specs, payload=payload)
        self._extract_residual_name(message=message, field_specs=field_specs, descriptor=descriptor, payload=payload)
        return {key: value for key, value in payload.items() if value not in ("", None)}

    def _extract_json_payload(self, *, message: str, field_specs: list[CrudFieldSpec]) -> dict[str, Any]:
        match = re.search(r"\{.*\}", message or "", flags=re.DOTALL)
        if not match:
            return {}
        try:
            data = json.loads(match.group(0))
        except Exception:
            return {}
        if not isinstance(data, dict):
            return {}
        terms_to_field = self._terms_to_field(field_specs)
        payload = {}
        for raw_key, value in data.items():
            field = terms_to_field.get(self._normalize(str(raw_key)))
            if not field:
                continue
            payload[field.name] = self._coerce_value(field, value)
        return payload

    def _extract_key_value_payload(self, *, message: str, field_specs: list[CrudFieldSpec]) -> dict[str, Any]:
        if not field_specs:
            return {}

        all_terms = []
        for field in field_specs:
            all_terms.extend(field.terms)
        all_pattern = "|".join(re.escape(term) for term in sorted(set(all_terms), key=len, reverse=True))
        payload: dict[str, Any] = {}

        for field in field_specs:
            field_pattern = "|".join(re.escape(term) for term in field.terms)
            if not field_pattern:
                continue
            pattern = re.compile(
                rf"(?<!\w)(?:{field_pattern})(?!\w)\s*(?:[:=\-]|é|e|is)?\s+(.+?)(?=(?:[,;\n]|\s+(?:{all_pattern})(?!\w)\s*(?:[:=\-]|é|e|is)?\s+)|$)",
                flags=re.IGNORECASE,
            )
            matches = list(pattern.finditer(message or ""))
            if not matches:
                continue
            raw_value = self._best_field_match(field=field, matches=matches)
            if raw_value:
                payload[field.name] = self._coerce_value(field, raw_value)
        return payload

    def _best_field_match(self, *, field: CrudFieldSpec, matches: list[re.Match]) -> str:
        values = [self._clean_repeated_field_prefix(field=field, value=match.group(1)) for match in matches]
        values = [value for value in values if value]
        if not values:
            return ""
        field_type = field.field_type.lower()
        if any(kind in field_type for kind in ("decimal", "float", "integer")):
            numeric = [value for value in values if re.search(r"-?\d+(?:[,.]\d+)?", value)]
            if numeric:
                return numeric[-1]
        return values[-1]

    def _clean_repeated_field_prefix(self, *, field: CrudFieldSpec, value: str) -> str:
        cleaned = self._clean_value(value)
        # Example: "histórico de factura factura FAT-..." can make the first
        # "factura" be treated as the field label. Remove repeated field labels
        # from the captured value before resolving related objects.
        for _ in range(3):
            changed = False
            for term in field.terms:
                pattern = rf"(?i)^\s*{re.escape(term)}(?:\s+|[:=\-]\s*)"
                if re.match(pattern, cleaned):
                    cleaned = self._clean_value(re.sub(pattern, "", cleaned, count=1))
                    changed = True
                    break
            if not changed:
                break
        return cleaned

    def _extract_common_payload(self, *, message: str, field_specs: list[CrudFieldSpec], payload: dict[str, Any]) -> None:
        by_name = {field.name: field for field in field_specs}
        email_field = next((field for field in field_specs if field.name.lower() == "email"), None)
        if email_field and email_field.name not in payload:
            match = re.search(r"[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}", message or "")
            if match:
                payload[email_field.name] = match.group(0)

        phone_field = next(
            (
                field
                for field in field_specs
                if field.name.lower() in {"contact", "phone", "telefone", "contacto", "mobile", "cellphone"}
            ),
            None,
        )
        if phone_field and phone_field.name not in payload:
            match = re.search(r"(?:\+?\d[\d\s().-]{6,}\d)", message or "")
            if match:
                payload[phone_field.name] = re.sub(r"\s+", " ", match.group(0)).strip()

        birth_field = by_name.get("birth_date")
        if birth_field and birth_field.name not in payload:
            match = re.search(r"\b(\d{4}-\d{2}-\d{2}|\d{1,2}/\d{1,2}/\d{4})\b", message or "")
            if match:
                payload[birth_field.name] = self._coerce_value(birth_field, match.group(1))

        gender_field = by_name.get("gender")
        if gender_field and gender_field.name not in payload:
            normalized = self._normalize(message)
            if re.search(r"\b(feminino|female|mulher|f)\b", normalized):
                payload[gender_field.name] = self._coerce_value(gender_field, "F")
            elif re.search(r"\b(masculino|male|homem|m)\b", normalized):
                payload[gender_field.name] = self._coerce_value(gender_field, "M")

    def _extract_residual_name(
        self,
        *,
        message: str,
        field_specs: list[CrudFieldSpec],
        descriptor: ResourceDescriptor,
        payload: dict[str, Any],
    ) -> None:
        name_field = next((field for field in field_specs if field.name == "name"), None)
        if not name_field or name_field.name in payload:
            return
        if "{" in message and "}" in message:
            return

        residual = f" {message or ''} "
        for term in (*CREATE_TERMS, *UPDATE_TERMS, *DELETE_TERMS):
            residual = re.sub(rf"(?i)\b{re.escape(term)}\b", " ", residual)
        resource_terms = {
            descriptor.route_name,
            descriptor.model_name,
            descriptor.label_pt,
            descriptor.label_en,
            descriptor.label_pt.rstrip("s"),
            descriptor.label_en.rstrip("s"),
            *descriptor.keywords[:12],
        }
        for term in sorted(resource_terms, key=len, reverse=True):
            if not term or len(term) < 3:
                continue
            residual = re.sub(rf"(?i)\b{re.escape(term)}\b", " ", residual)
        residual = re.sub(
            r"(?i)\b(um|uma|o|a|os|as|com|de|do|da|para|por favor|please|with|called|chamado|chamada)\b",
            " ",
            residual,
        )
        residual = self._clean_value(residual)
        if not residual or any(separator in residual for separator in (":", "=", "{", "}", "/")):
            return
        words = residual.split()
        if 1 <= len(words) <= 8 and 2 <= len(residual) <= 120:
            payload[name_field.name] = residual

    def _terms_to_field(self, field_specs: list[CrudFieldSpec]) -> dict[str, CrudFieldSpec]:
        mapping: dict[str, CrudFieldSpec] = {}
        for field in field_specs:
            for term in field.terms:
                mapping[self._normalize(term)] = field
        return mapping

    def _coerce_value(self, field: CrudFieldSpec, value: Any) -> Any:
        if self._is_many_related_field(field) and isinstance(value, list):
            return value
        if value is None or isinstance(value, (bool, int, float)):
            return value
        raw = self._clean_value(str(value))
        normalized = self._normalize(raw)
        if field.choices:
            for key, label in field.choices:
                normalized_key = self._normalize(key)
                normalized_label = self._normalize(label)
                if normalized in {normalized_key, normalized_label}:
                    return key
            for key, label in field.choices:
                normalized_key = self._normalize(key)
                normalized_label = self._normalize(label)
                if (
                    len(normalized) >= 3
                    and (
                        normalized_key.startswith(normalized)
                        or normalized_label.startswith(normalized)
                        or normalized in normalized_label.split()
                    )
                ):
                    return key

        field_type = field.field_type.lower()
        if "boolean" in field_type:
            if normalized in {"sim", "s", "yes", "y", "true", "verdadeiro", "1"}:
                return True
            if normalized in {"nao", "não", "n", "no", "false", "falso", "0"}:
                return False
        if self._is_many_related_field(field):
            return raw
        if "primarykey" in field_type:
            return int(raw) if re.match(r"^\d+$", raw) else raw
        if "integer" in field_type:
            match = re.search(r"-?\d+", raw)
            return int(match.group(0)) if match else raw
        if "decimal" in field_type or "float" in field_type:
            number = raw.replace(" ", "").replace(",", ".")
            try:
                return number if "decimal" in field_type else float(number)
            except ValueError:
                return raw
        if "date" in field_type and re.match(r"^\d{1,2}/\d{1,2}/\d{4}$", raw):
            day, month, year = raw.split("/")
            return f"{year}-{int(month):02d}-{int(day):02d}"
        return raw

    def _resolve_related_values(
        self,
        *,
        payload: dict[str, Any],
        field_specs: list[CrudFieldSpec],
        tenant,
    ) -> dict[str, Any]:
        if not payload:
            return payload

        by_name = {field.name: field for field in field_specs}
        resolved = dict(payload)
        for field_name, value in list(payload.items()):
            field = by_name.get(field_name)
            if not field or not (self._is_primary_key_field(field) or self._is_many_related_field(field)):
                continue
            if self._is_many_related_field(field):
                resolved[field_name] = self._resolve_many_related_value(field=field, value=value, tenant=tenant)
                continue
            if isinstance(value, int):
                continue
            raw = str(value or "").strip()
            if not raw:
                continue
            if raw.isdigit():
                resolved[field_name] = int(raw)
                continue
            related_pk = self._lookup_related_pk(field=field, raw=raw, tenant=tenant)
            if related_pk is not None:
                resolved[field_name] = related_pk
        return resolved

    def _is_primary_key_field(self, field: CrudFieldSpec) -> bool:
        return "primarykey" in field.field_type.lower()

    def _is_many_related_field(self, field: CrudFieldSpec) -> bool:
        field_type = field.field_type.lower()
        return "manyrelated" in field_type or "many" in field_type and bool(field.related_model_name)

    def _resolve_many_related_value(self, *, field: CrudFieldSpec, value: Any, tenant) -> list[Any]:
        raw_items = value if isinstance(value, list) else self._split_related_values(str(value or ""))
        resolved_items: list[Any] = []
        for item in raw_items:
            if isinstance(item, int):
                resolved_items.append(item)
                continue
            raw = str(item or "").strip()
            if not raw:
                continue
            if raw.isdigit():
                resolved_items.append(int(raw))
                continue
            related_pk = self._lookup_related_pk(field=field, raw=raw, tenant=tenant)
            resolved_items.append(related_pk if related_pk is not None else raw)
        return resolved_items

    def _split_related_values(self, raw: str) -> list[str]:
        cleaned = self._clean_value(raw)
        if not cleaned:
            return []
        # Natural-language lists in PT/EN, while keeping single names intact.
        parts = re.split(r"\s*(?:,|;|\s+e\s+|\s+and\s+)\s*", cleaned, flags=re.IGNORECASE)
        return [self._clean_value(part) for part in parts if self._clean_value(part)]

    def _lookup_related_pk(self, *, field: CrudFieldSpec, raw: str, tenant):
        if not field.related_app_label or not field.related_model_name:
            return None
        try:
            model = django_apps.get_model(field.related_app_label, field.related_model_name)
        except Exception:
            return None

        queryset = model._default_manager.all()
        if tenant is not None and self._model_has_field(model, "tenant"):
            queryset = queryset.filter(tenant=tenant)
        if self._model_has_field(model, "deleted"):
            queryset = queryset.filter(deleted=False)

        query = Q()
        for lookup_field in RELATED_LOOKUP_FIELDS:
            if not self._model_has_field(model, lookup_field):
                continue
            lookup = "iexact" if lookup_field != "name" else "icontains"
            query |= Q(**{f"{lookup_field}__{lookup}": raw})
        if not query:
            return None
        obj = queryset.filter(query).order_by("-id").first()
        return getattr(obj, "pk", None) if obj is not None else None

    def _model_has_field(self, model, field_name: str) -> bool:
        try:
            model._meta.get_field(field_name)
            return True
        except FieldDoesNotExist:
            return False

    def _clean_value(self, value: str) -> str:
        value = (value or "").strip()
        value = re.sub(r"\s+", " ", value)
        value = re.sub(r"^[,;:\-\s]+|[,;.\-\s]+$", "", value)
        return value.strip()

    def _extract_object_ref(self, message: str) -> str:
        for pattern in (
            r"\b(?:id|pk|codigo|código|code|custom_id)\s*[:=#\-]?\s*([A-Za-z0-9_.-]+)",
            r"#(\d+)\b",
            r"\b([A-Z]{2,12}-[A-Z0-9-]{4,})\b",
        ):
            match = re.search(pattern, message or "", flags=re.IGNORECASE)
            if match:
                return match.group(1).strip()
        return ""

    def _missing_required_fields(
        self,
        *,
        operation: str,
        payload: dict[str, Any],
        field_specs: list[CrudFieldSpec],
    ) -> list[CrudFieldSpec]:
        if operation != "create":
            return []
        return [field for field in field_specs if field.required and field.name not in payload]

    def _collecting_result(
        self,
        *,
        operation: str,
        descriptor: ResourceDescriptor,
        payload: dict[str, Any],
        missing_fields: list[CrudFieldSpec],
        field_specs: list[CrudFieldSpec],
        language: str,
        object_ref: str = "",
        needs_object_ref: bool = False,
        needs_fields: bool = False,
    ) -> dict[str, Any]:
        prompts_pt = []
        prompts_en = []
        if missing_fields:
            prompts_pt.append("Dados em falta: " + ", ".join(field.label for field in missing_fields[:8]) + ".")
            prompts_en.append("Missing data: " + ", ".join(field.label for field in missing_fields[:8]) + ".")
        if needs_object_ref:
            prompts_pt.append("Indique o ID ou código do registo que deve ser alterado/removido.")
            prompts_en.append("Provide the ID or code of the record that should be updated/deleted.")
        if needs_fields:
            prompts_pt.append("Indique os campos e os novos valores.")
            prompts_en.append("Provide the fields and the new values.")

        return {
            "summary": {
                "title_pt": "CRUD conversacional em recolha",
                "title_en": "Conversational CRUD collecting data",
                "metrics": [
                    {"label_pt": "Recurso", "label_en": "Resource", "value": descriptor.label(language)},
                    {"label_pt": "Campos preenchidos", "label_en": "Captured fields", "value": len(payload)},
                    {"label_pt": "Campos em falta", "label_en": "Missing fields", "value": len(missing_fields)},
                ],
            },
            "crud": {
                "status": "collecting",
                "operation": operation,
                "resource": descriptor.as_catalog_item(language=language),
                "payload": payload,
                "object_ref": object_ref,
                "missing_fields": [self._field_payload(field) for field in missing_fields],
                "needs_object_ref": needs_object_ref,
                "needs_fields": needs_fields,
                "available_fields": [self._field_payload(field) for field in field_specs[:40]],
                "prompt_pt": " ".join(prompts_pt),
                "prompt_en": " ".join(prompts_en),
            },
            "access_denied": False,
            "sources": [
                {"type": "endpoint", "label": descriptor.basename, "href": descriptor.href},
                {"type": "policy", "label": "RBAC", "href": ""},
            ],
        }

    def _ready_result(
        self,
        *,
        operation: str,
        descriptor: ResourceDescriptor,
        payload: dict[str, Any],
        object_ref: str,
        field_specs: list[CrudFieldSpec],
        user,
        language: str,
    ) -> dict[str, Any]:
        method = self._method_for_operation(operation)
        action_type = f"ai_crud_{operation}"
        labels = self._action_labels(operation=operation, descriptor=descriptor)
        user_groups = sorted(AiPolicyGuard().user_group_names(user))
        prepared_payload = {
            "operation": operation,
            "method": method,
            "basename": descriptor.basename,
            "module": descriptor.prefix,
            "route_name": descriptor.route_name,
            "endpoint": descriptor.href,
            "resource_label_pt": descriptor.label_pt,
            "resource_label_en": descriptor.label_en,
            "data": payload,
            "object_ref": object_ref,
            "field_labels": {field.name: field.label for field in field_specs},
            "allowed_groups": user_groups,
        }
        return {
            "summary": {
                "title_pt": "CRUD preparado para confirmação",
                "title_en": "CRUD prepared for confirmation",
                "metrics": [
                    {"label_pt": "Recurso", "label_en": "Resource", "value": descriptor.label(language)},
                    {"label_pt": "Operação", "label_en": "Operation", "value": operation},
                    {"label_pt": "Campos", "label_en": "Fields", "value": len(payload)},
                ],
            },
            "crud": {
                "status": "ready",
                "operation": operation,
                "resource": descriptor.as_catalog_item(language=language),
                "payload": payload,
                "object_ref": object_ref,
                "available_fields": [self._field_payload(field) for field in field_specs[:40]],
            },
            "prepared_action": {
                "action_type": action_type,
                "requires_confirmation": True,
                "payload": prepared_payload,
                "label_pt": labels["label_pt"],
                "label_en": labels["label_en"],
                "confirmation_summary_pt": labels["confirmation_summary_pt"],
                "confirmation_summary_en": labels["confirmation_summary_en"],
            },
            "access_denied": False,
            "sources": [
                {"type": "endpoint", "label": descriptor.basename, "href": descriptor.href},
                {"type": "policy", "label": "RBAC", "href": ""},
            ],
        }

    def _access_denied(self, *, descriptor: ResourceDescriptor, method: str, language: str) -> dict[str, Any]:
        denied = descriptor.as_catalog_item(language=language)
        return {
            "summary": {
                "title_pt": "CRUD bloqueado por permissões",
                "title_en": "CRUD blocked by permissions",
                "metrics": [
                    {"label_pt": "Recurso bloqueado", "label_en": "Blocked resource", "value": descriptor.label(language)},
                    {"label_pt": "Método", "label_en": "Method", "value": method},
                ],
                "denied_resources": [denied],
            },
            "access_denied": True,
            "denied_resources": [denied],
            "sources": [{"type": "policy", "label": "RBAC", "href": ""}],
        }

    def _operation_unavailable(
        self,
        *,
        descriptor: ResourceDescriptor,
        method: str,
        operation: str,
        language: str,
    ) -> dict[str, Any]:
        return {
            "summary": {
                "title_pt": "CRUD indisponível pelo fluxo de domínio",
                "title_en": "CRUD unavailable by domain workflow",
                "metrics": [
                    {"label_pt": "Recurso", "label_en": "Resource", "value": descriptor.label(language)},
                    {"label_pt": "Método", "label_en": "Method", "value": method},
                ],
            },
            "crud": {
                "status": "unavailable",
                "operation": operation,
                "resource": descriptor.as_catalog_item(language=language),
                "method": method,
                "prompt_pt": (
                    "Este recurso não aceita esta operação manual. Use a transição operacional própria "
                    "do módulo ou escolha outro recurso editável."
                ),
                "prompt_en": (
                    "This resource does not accept this manual operation. Use the module-specific "
                    "operational transition or choose another editable resource."
                ),
            },
            "access_denied": False,
            "sources": [
                {"type": "endpoint", "label": descriptor.basename, "href": descriptor.href},
                {"type": "policy", "label": "Domain workflow", "href": ""},
            ],
        }

    def _needs_resource(self, *, operation: str, language: str) -> dict[str, Any]:
        return {
            "summary": {
                "title_pt": "Recurso necessário",
                "title_en": "Resource required",
                "metrics": [{"label_pt": "Operação", "label_en": "Operation", "value": operation}],
            },
            "crud": {
                "status": "needs_resource",
                "operation": operation,
                "prompt_pt": "Diga em que módulo/recurso devo executar esta operação. Ex.: paciente, consulta, estudante, pagamento.",
                "prompt_en": "Tell me which module/resource should receive this operation. Example: patient, consultation, student, payment.",
            },
            "access_denied": False,
            "sources": [{"type": "policy", "label": "RBAC", "href": ""}],
        }

    def _no_intent(self, *, language: str) -> dict[str, Any]:
        return {
            "summary": {
                "title_pt": "Sem intenção de CRUD",
                "title_en": "No CRUD intent",
                "metrics": [],
            },
            "crud": {"status": "no_intent"},
            "access_denied": False,
            "sources": [],
        }

    def _field_payload(self, field: CrudFieldSpec) -> dict[str, Any]:
        return {
            "name": field.name,
            "label": field.label,
            "required": field.required,
            "type": field.field_type,
            "aliases": list(field.aliases),
            "choices": [{"value": key, "label": label} for key, label in field.choices[:30]],
            "related_model": f"{field.related_app_label}.{field.related_model_name}" if field.related_app_label else "",
        }

    def _action_labels(self, *, operation: str, descriptor: ResourceDescriptor) -> dict[str, str]:
        verbs = {
            "create": ("Confirmar criação", "Confirm creation", "Criar", "Create"),
            "update": ("Confirmar alteração", "Confirm update", "Alterar", "Update"),
            "delete": ("Confirmar remoção", "Confirm deletion", "Remover", "Delete"),
        }
        label_pt, label_en, summary_pt_verb, summary_en_verb = verbs[operation]
        return {
            "label_pt": f"{label_pt} de {descriptor.label_pt}",
            "label_en": f"{label_en} of {descriptor.label_en}",
            "confirmation_summary_pt": f"{summary_pt_verb} {descriptor.label_pt} via IA, com revalidação de permissões.",
            "confirmation_summary_en": f"{summary_en_verb} {descriptor.label_en} through AI, with permission revalidation.",
        }

    def _normalize(self, value: str) -> str:
        from apps.ai_assistant.tools.resource_catalog import normalize_text

        return normalize_text(value)


class AiCrudActionRunner:
    """Executa acções CRUD confirmadas reutilizando os ViewSets registados."""

    def execute(self, *, action: AiSuggestedAction, user, tenant) -> AiSuggestedAction:
        payload = action.payload or {}
        operation = str(payload.get("operation") or "").strip()
        descriptor = descriptor_by_basename(str(payload.get("basename") or ""))
        if descriptor is None:
            return self._fail(action, "Recurso da acção CRUD não encontrado.")
        if operation not in {"create", "update", "delete"}:
            return self._fail(action, "Operação CRUD inválida.")

        method = {"create": "POST", "update": "PATCH", "delete": "DELETE"}[operation]
        if not user_can_method_resource(user=user, basename=descriptor.basename, method=method):
            return self._fail(action, "O utilizador já não tem permissão para executar esta operação.")
        if method in RESOURCE_METHOD_BLOCKLIST.get(descriptor.basename, frozenset()):
            return self._fail(action, "Esta operação não está disponível para execução manual neste recurso.")

        if operation == "create":
            response_data, status_code = self._dispatch_create(descriptor=descriptor, tenant=tenant, user=user, data=payload.get("data") or {})
        elif operation == "update":
            object_pk = self._resolve_object_pk(descriptor=descriptor, tenant=tenant, user=user, object_ref=str(payload.get("object_ref") or ""))
            response_data, status_code = self._dispatch_update(
                descriptor=descriptor,
                tenant=tenant,
                user=user,
                object_pk=object_pk,
                data=payload.get("data") or {},
            )
        else:
            object_pk = self._resolve_object_pk(descriptor=descriptor, tenant=tenant, user=user, object_ref=str(payload.get("object_ref") or ""))
            response_data, status_code = self._dispatch_delete(
                descriptor=descriptor,
                tenant=tenant,
                user=user,
                object_pk=object_pk,
            )

        if status_code >= 400:
            return self._fail(action, f"Falha ao executar CRUD ({status_code}): {response_data}")

        result_object = self._result_object(response_data)
        result_id = result_object.get("id") if isinstance(result_object, dict) else ""
        if not result_id and operation in {"update", "delete"}:
            result_id = payload.get("object_ref") or ""
        href = f"{descriptor.href}{result_id}/" if result_id else descriptor.href

        now = timezone.now()
        action.status = AiSuggestedAction.Status.CONFIRMED
        action.confirmed_by = user
        action.confirmed_at = now
        action.executed_at = now
        action.result_summary = self._success_summary(operation=operation, descriptor=descriptor, status_code=status_code)
        action.result_href = href
        action.payload = {
            **payload,
            "executed_status_code": status_code,
            "result": response_data,
            "href": href,
        }
        action.save(
            update_fields=[
                "status",
                "confirmed_by",
                "confirmed_at",
                "executed_at",
                "result_summary",
                "result_href",
                "payload",
                "updated_at",
            ]
        )
        return action

    def _dispatch_create(self, *, descriptor: ResourceDescriptor, tenant, user, data: dict[str, Any]) -> tuple[Any, int]:
        return self._dispatch(
            descriptor=descriptor,
            tenant=tenant,
            user=user,
            method="post",
            path=descriptor.href,
            action_map={"post": "create"},
            detail=False,
            data=data,
        )

    def _dispatch_update(
        self,
        *,
        descriptor: ResourceDescriptor,
        tenant,
        user,
        object_pk: Any,
        data: dict[str, Any],
    ) -> tuple[Any, int]:
        return self._dispatch(
            descriptor=descriptor,
            tenant=tenant,
            user=user,
            method="patch",
            path=f"{descriptor.href}{object_pk}/",
            action_map={"patch": "partial_update"},
            detail=True,
            data=data,
            pk=object_pk,
        )

    def _dispatch_delete(self, *, descriptor: ResourceDescriptor, tenant, user, object_pk: Any) -> tuple[Any, int]:
        return self._dispatch(
            descriptor=descriptor,
            tenant=tenant,
            user=user,
            method="delete",
            path=f"{descriptor.href}{object_pk}/",
            action_map={"delete": "destroy"},
            detail=True,
            data={},
            pk=object_pk,
        )

    def _dispatch(
        self,
        *,
        descriptor: ResourceDescriptor,
        tenant,
        user,
        method: str,
        path: str,
        action_map: dict[str, str],
        detail: bool,
        data: dict[str, Any],
        pk: Any = None,
    ) -> tuple[Any, int]:
        viewset_class = viewset_for_descriptor(descriptor)
        if viewset_class is None:
            raise ValidationError("ViewSet do recurso não encontrado.")

        factory = APIRequestFactory()
        request_method = getattr(factory, method)
        request = request_method(path, data, format="json", HTTP_HOST=str(getattr(tenant, "domain", "") or "testserver"))
        request.tenant = tenant
        force_authenticate(request, user=user)
        view = viewset_class.as_view(action_map, basename=descriptor.basename, detail=detail)
        response = view(request, pk=pk) if pk is not None else view(request)
        return getattr(response, "data", None), int(getattr(response, "status_code", status.HTTP_500_INTERNAL_SERVER_ERROR))

    def _resolve_object_pk(self, *, descriptor: ResourceDescriptor, tenant, user, object_ref: str):
        object_ref = (object_ref or "").strip()
        if not object_ref:
            raise ValidationError("ID/código do registo é obrigatório.")
        if object_ref.isdigit():
            return int(object_ref)

        queryset = scoped_queryset_for_resource(descriptor=descriptor, tenant=tenant, user=user)
        query = Q()
        model = queryset.model
        for field_name in RELATED_LOOKUP_FIELDS:
            try:
                model._meta.get_field(field_name)
            except FieldDoesNotExist:
                continue
            query |= Q(**{f"{field_name}__iexact": object_ref})
        if not query:
            raise ValidationError("Este recurso não expõe um campo de código pesquisável.")
        obj = queryset.filter(query).order_by("-id").first()
        if obj is None:
            raise ValidationError("Registo não encontrado no escopo do utilizador.")
        return obj.pk

    def _result_object(self, response_data: Any) -> dict[str, Any]:
        if not isinstance(response_data, dict):
            return {}
        nested = response_data.get("data")
        if isinstance(nested, dict):
            return nested
        return response_data

    def _success_summary(self, *, operation: str, descriptor: ResourceDescriptor, status_code: int) -> str:
        verbs = {
            "create": "criado",
            "update": "actualizado",
            "delete": "removido",
        }
        return f"{descriptor.label_pt} {verbs[operation]} com sucesso ({status_code})."

    def _fail(self, action: AiSuggestedAction, reason: str) -> AiSuggestedAction:
        action.status = AiSuggestedAction.Status.FAILED
        action.result_summary = reason
        action.save(update_fields=["status", "result_summary", "updated_at"])
        raise ValidationError(reason)


class _ContextRequest:
    def __init__(self, *, user, tenant) -> None:
        self.user = user
        self.tenant = tenant
        self.method = "POST"
        self.query_params = {}
