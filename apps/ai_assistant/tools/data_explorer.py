from __future__ import annotations

import re
from typing import Any

from django.core.exceptions import FieldDoesNotExist
from django.db.models import Model, Q, QuerySet

from apps.ai_assistant.services.resource_disambiguation import resolve_resource_matches
from apps.ai_assistant.services.semantic_filters import apply_semantic_filters

from .base import AiTool, AiToolContext
from .resource_catalog import (
    ResourceDescriptor,
    accessible_resources_for_user,
    descriptors_by_module,
    normalize_text,
    scoped_queryset_for_resource,
    user_can_read_resource,
)

DATA_QUERY_TERMS = (
    "quantos",
    "quantas",
    "listar",
    "lista",
    "mostre",
    "mostrar",
    "ver",
    "procure",
    "buscar",
    "pesquisar",
    "investigar",
    "dados",
    "base de dados",
    "banco de dados",
    "registos",
    "registros",
    "tabela",
    "records",
    "show",
    "list",
    "search",
)

SAFE_FIELD_NAMES = (
    "custom_id",
    "student_code",
    "teacher_code",
    "status",
    "workflow_status",
    "billing_status",
    "clinical_status",
    "type",
    "origin",
    "method",
    "path",
    "status_code",
    "duration_ms",
    "view_basename",
    "view_action",
    "exception_class",
    "object_id",
    "lot_number",
    "expiration_date",
    "initial_quantity",
    "number",
    "active",
    "total",
    "value",
    "paid_at",
    "admission_date",
    "performed_date",
    "created_at",
    "updated_at",
)

SEARCHABLE_FIELD_NAMES = (
    "custom_id",
    "student_code",
    "teacher_code",
    "name",
    "status",
    "workflow_status",
    "billing_status",
    "clinical_status",
    "type",
    "method",
    "path",
    "full_path",
    "view_basename",
    "view_action",
    "exception_class",
    "object_id",
    "lot_number",
    "number",
)


class ExploreDatabaseTool(AiTool):
    name = "explore_database"
    description_pt = "Explora recursos do banco de dados com tenant, RBAC e amostras seguras."
    description_en = "Explores database resources with tenant, RBAC and safe samples."
    required_groups: tuple[str, ...] = ()
    mode = "read"

    def run(self, context: AiToolContext) -> dict[str, Any]:
        message = str(context.arguments.get("message") or "")
        language = context.language
        session_metadata = {
            "conversation_focus": context.arguments.get("conversation_focus") or {},
            "intent_clarification": context.arguments.get("intent_clarification") or {},
        }
        matches = self._match_resources(
            message,
            active_module=context.active_module,
            session_metadata=session_metadata,
        )
        accessible = accessible_resources_for_user(context.user)

        if not matches:
            return self._catalog_result(accessible=accessible, language=language)

        denied = [descriptor for descriptor in matches if not user_can_read_resource(user=context.user, basename=descriptor.basename)]
        allowed = [descriptor for descriptor in matches if user_can_read_resource(user=context.user, basename=descriptor.basename)]
        if denied and not allowed:
            return self._access_denied_result(denied=denied, language=language)

        resource_results = [
            self._resource_result(descriptor=descriptor, context=context, message=message)
            for descriptor in allowed[:5]
        ]
        metrics = [
            {
                "label_pt": item["label_pt"],
                "label_en": item["label_en"],
                "value": item["filtered_count"],
            }
            for item in resource_results
        ]
        if denied:
            metrics.append(
                {
                    "label_pt": "Recursos bloqueados",
                    "label_en": "Blocked resources",
                    "value": len(denied),
                }
            )

        sources = [
            {"type": "model", "label": item["model"], "href": item["href"]}
            for item in resource_results
        ]
        sources.append({"type": "policy", "label": "RBAC", "href": ""})

        return {
            "summary": {
                "title_pt": "Exploração segura de dados",
                "title_en": "Secure data exploration",
                "metrics": metrics,
                "resource_results": resource_results,
                "denied_resources": [descriptor.as_catalog_item(language=language) for descriptor in denied],
            },
            "resource_results": resource_results,
            "denied_resources": [descriptor.as_catalog_item(language=language) for descriptor in denied],
            "access_denied": False,
            "sources": sources,
        }

    def _catalog_result(self, *, accessible: list[ResourceDescriptor], language: str) -> dict[str, Any]:
        modules = descriptors_by_module(accessible)
        catalog = [descriptor.as_catalog_item(language=language) for descriptor in accessible[:80]]
        return {
            "summary": {
                "title_pt": "Dados que pode investigar",
                "title_en": "Data you can investigate",
                "metrics": [
                    {"label_pt": "Módulos disponíveis", "label_en": "Available modules", "value": len(modules)},
                    {"label_pt": "Recursos disponíveis", "label_en": "Available resources", "value": len(accessible)},
                ],
                "catalog": catalog,
                "accessible_modules": modules,
                "investigation_prompt_pt": "Escolha um módulo ou pergunte por uma contagem/listagem específica.",
                "investigation_prompt_en": "Choose a module or ask for a specific count/list.",
            },
            "catalog": catalog,
            "accessible_modules": modules,
            "access_denied": False,
            "sources": [{"type": "policy", "label": "RBAC", "href": ""}],
        }

    def _access_denied_result(self, *, denied: list[ResourceDescriptor], language: str) -> dict[str, Any]:
        denied_payload = [descriptor.as_catalog_item(language=language) for descriptor in denied]
        return {
            "summary": {
                "title_pt": "Acesso negado",
                "title_en": "Access denied",
                "metrics": [
                    {"label_pt": "Acesso", "label_en": "Access", "value": "negado"},
                    {"label_pt": "Recursos bloqueados", "label_en": "Blocked resources", "value": len(denied)},
                ],
                "denied_resources": denied_payload,
            },
            "access_denied": True,
            "denied_resources": denied_payload,
            "sources": [{"type": "policy", "label": "RBAC", "href": ""}],
        }

    def _resource_result(self, *, descriptor: ResourceDescriptor, context: AiToolContext, message: str) -> dict[str, Any]:
        queryset = scoped_queryset_for_resource(descriptor=descriptor, tenant=context.tenant, user=context.user)
        total_count = queryset.count()
        semantic_filters = apply_semantic_filters(queryset=queryset, message=message, descriptor=descriptor)
        queryset = semantic_filters.queryset
        queryset = self._apply_search(queryset=queryset, message=message)
        filtered_count = queryset.count()
        rows = self._sample_rows(queryset=queryset)
        return {
            "basename": descriptor.basename,
            "label_pt": descriptor.label_pt,
            "label_en": descriptor.label_en,
            "module": descriptor.prefix,
            "module_label_pt": descriptor.module_label_pt,
            "module_label_en": descriptor.module_label_en,
            "model": descriptor.model_label,
            "href": descriptor.href,
            "total_count": total_count,
            "filtered_count": filtered_count,
            "sample_count": len(rows),
            "applied_filters": list(semantic_filters.applied_filters),
            "skipped_filters": list(semantic_filters.skipped_filters),
            "records": rows,
        }

    def _match_resources(
        self,
        message: str,
        *,
        active_module: str = "",
        session_metadata: dict[str, Any] | None = None,
    ) -> list[ResourceDescriptor]:
        normalized = normalize_text(message)
        if not normalized:
            return []

        resolution = resolve_resource_matches(
            message,
            active_module=active_module,
            session_metadata=session_metadata or {},
        )
        matches = [match.descriptor for match in resolution.matches]
        if not matches and any(term in normalized for term in (normalize_text(item) for item in DATA_QUERY_TERMS)):
            return []
        return matches

    def _apply_search(self, *, queryset: QuerySet, message: str) -> QuerySet:
        model = queryset.model
        search_terms = self._extract_search_terms(message)
        if not search_terms:
            return queryset

        searchable_fields = [field for field in SEARCHABLE_FIELD_NAMES if _model_has_field(model, field)]
        if not searchable_fields:
            return queryset

        query = Q()
        for term in search_terms[:4]:
            for field in searchable_fields:
                query |= Q(**{f"{field}__icontains": term})
        if not query:
            return queryset
        return queryset.filter(query)

    def _extract_search_terms(self, message: str) -> list[str]:
        terms = []
        for match in re.findall(r"\b[A-Z]{2,12}-[A-Z0-9-]+", message or "", flags=re.IGNORECASE):
            terms.append(match.upper())
        for match in re.findall(r"['\"]([^'\"]{3,80})['\"]", message or ""):
            terms.append(match.strip())
        return list(dict.fromkeys(term for term in terms if term))

    def _sample_rows(self, *, queryset: QuerySet) -> list[dict[str, Any]]:
        model = queryset.model
        ordering = ["-created_at", "-id"] if _model_has_field(model, "created_at") else ["-id"]
        rows = []
        for obj in queryset.order_by(*ordering)[:5]:
            rows.append(_safe_model_snapshot(obj))
        return rows


def _model_has_field(model: type[Model], field_name: str) -> bool:
    try:
        model._meta.get_field(field_name)
        return True
    except FieldDoesNotExist:
        return False


def _safe_model_snapshot(obj: Model) -> dict[str, Any]:
    model = obj.__class__
    payload: dict[str, Any] = {"id": getattr(obj, "id", None)}
    for field_name in SAFE_FIELD_NAMES:
        if not _model_has_field(model, field_name):
            continue
        value = getattr(obj, field_name, None)
        payload[field_name] = _serialize_safe_value(value)
    return {key: value for key, value in payload.items() if value not in (None, "")}


def _serialize_safe_value(value: Any) -> Any:
    if hasattr(value, "isoformat"):
        return value.isoformat()
    if isinstance(value, (str, int, float, bool)):
        return value
    if value is None:
        return None
    return str(value)
