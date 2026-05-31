from __future__ import annotations

from collections import defaultdict
from datetime import UTC, datetime
import inspect
from pathlib import Path
from typing import Any

from django.apps import apps as django_apps
from django.conf import settings
from django.db.models import Field, Model

from api.v1.routing.routes import VIEWSET_GROUPS
from apps.ai_assistant.services.phase1_audit import DIRECT_TOOL_MODULES, GENERIC_AI_TOOLS
from apps.ai_assistant.services.policy import normalize_group
from apps.ai_assistant.services.registry import AiToolRegistry
from apps.ai_assistant.tools.resource_catalog import (
    MODULE_ALIASES,
    MODULE_LABELS,
    RESOURCE_ALIASES,
    RESOURCE_LABELS,
    get_resource_descriptors,
    viewset_for_descriptor,
)
from security.permissions.rbac import GROUPS, ROLE_POLICY, SAFE_METHODS, WRITE_METHODS

STANDARD_ACTION_METHODS: dict[str, tuple[str, ...]] = {
    "list": ("GET",),
    "create": ("POST",),
    "retrieve": ("GET",),
    "update": ("PUT",),
    "partial_update": ("PATCH",),
    "destroy": ("DELETE",),
}
METHOD_ORDER = ("GET", "HEAD", "OPTIONS", "POST", "PUT", "PATCH", "DELETE")


def build_ai_project_map() -> dict[str, Any]:
    """Build a canonical project contract for AI routing and tool planning."""

    descriptors = list(get_resource_descriptors())
    resources = [_resource_contract(descriptor) for descriptor in descriptors]
    modules = _module_contracts(resources)
    tool_registry = _tool_registry_contract()

    field_count = sum(len(resource["model"]["fields"]) for resource in resources)
    action_count = sum(len(resource["actions"]) for resource in resources)
    relation_count = sum(len(resource["model"]["relations"]) for resource in resources)
    serializer_alias_count = sum(resource["serializer"]["alias_count"] for resource in resources)

    return {
        "phase": 2,
        "title": "Mapa canonico do projecto para a IA operacional",
        "generated_at": datetime.now(UTC).isoformat(),
        "summary": {
            "modules": len(modules),
            "resources": len(resources),
            "model_fields": field_count,
            "relations": relation_count,
            "custom_actions": action_count,
            "serializer_aliases": serializer_alias_count,
            "tools": len(tool_registry),
            "generic_ai_tools": len([tool for tool in tool_registry if tool["generic_capability"]]),
            "resources_with_custom_actions": len([resource for resource in resources if resource["actions"]]),
            "resources_with_serializer_aliases": len(
                [resource for resource in resources if resource["serializer"]["alias_count"]]
            ),
            "resources_without_role_policy": len(
                [resource for resource in resources if not resource["permissions"]["groups"]]
            ),
        },
        "modules": modules,
        "resources": resources,
        "tools": tool_registry,
        "semantic_contract": {
            "purpose": (
                "Este mapa e a fonte canonica para a IA ligar palavras do utilizador a modulos, recursos, "
                "campos, filtros, acoes e permissoes reais."
            ),
            "routing_inputs": [
                "module.aliases",
                "resource.keywords",
                "resource.serializer.input_aliases",
                "resource.model.fields",
                "resource.filters.filter_fields",
                "resource.actions",
                "resource.permissions",
            ],
            "guardrails": [
                "A IA deve selecionar candidatos por significado, mas executar sempre via ferramentas com RBAC.",
                "Operacoes de escrita continuam em duas fases: preparar e confirmar.",
                "Recursos sem ROLE_POLICY explicita devem ser tratados como lacuna de governanca, nao acesso livre.",
            ],
        },
        "priority_findings": _priority_findings(resources=resources, modules=modules),
    }


def render_ai_project_map_markdown(project_map: dict[str, Any]) -> str:
    summary = project_map["summary"]
    lines = [
        "# IA Operacional - Mapa Canonico Fase 2",
        "",
        f"Gerado em UTC: {project_map['generated_at']}",
        "",
        "## Resumo",
        "",
        f"- Modulos mapeados: {summary['modules']}",
        f"- Recursos mapeados: {summary['resources']}",
        f"- Campos de modelo: {summary['model_fields']}",
        f"- Relacoes: {summary['relations']}",
        f"- Acoes DRF customizadas: {summary['custom_actions']}",
        f"- Aliases de serializer: {summary['serializer_aliases']}",
        f"- Recursos sem ROLE_POLICY explicita: {summary['resources_without_role_policy']}",
        "",
        "## Modulos",
        "",
        "| Modulo | Label | Recursos | Campos | Acoes | Ferramentas directas |",
        "| --- | --- | ---: | ---: | ---: | --- |",
    ]

    for module in project_map["modules"]:
        tools = ", ".join(module["direct_ai_tools"]) if module["direct_ai_tools"] else "-"
        lines.append(
            f"| `{module['key']}` | {module['label_pt']} | {module['resource_count']} | "
            f"{module['field_count']} | {module['action_count']} | {tools} |"
        )

    action_resources = [resource for resource in project_map["resources"] if resource["actions"]]
    lines.extend(
        [
            "",
            "## Recursos Com Acoes",
            "",
            "| Recurso | Acoes |",
            "| --- | --- |",
        ]
    )
    for resource in action_resources[:80]:
        actions = ", ".join(f"{action['name']}:{'/'.join(action['methods'])}" for action in resource["actions"])
        lines.append(f"| `{resource['basename']}` | {actions} |")
    if len(action_resources) > 80:
        lines.append(f"| ... | {len(action_resources) - 80} recursos adicionais omitidos no Markdown |")

    lines.extend(
        [
            "",
            "## Achados Prioritarios",
            "",
        ]
    )
    lines.extend(f"- {finding}" for finding in project_map["priority_findings"])

    lines.extend(
        [
            "",
            "## Como A IA Deve Usar Este Mapa",
            "",
            "- Resolver palavras soltas primeiro contra aliases de modulo, aliases de recurso e aliases de serializer.",
            "- Usar campos, filtros e acoes para extrair slots antes de chamar ferramentas.",
            "- Validar sempre permissoes por `resource.permissions` antes de preparar qualquer acao.",
            "- Quando houver varios candidatos fortes, usar contexto activo ou pedir clarificacao curta.",
        ]
    )
    return "\n".join(lines).rstrip() + "\n"


def render_ai_project_map_text(project_map: dict[str, Any]) -> str:
    summary = project_map["summary"]
    findings = "\n".join(f"- {item}" for item in project_map["priority_findings"])
    return "\n".join(
        [
            "IA Operacional - Mapa Canonico Fase 2",
            f"Gerado em UTC: {project_map['generated_at']}",
            "",
            f"Modulos: {summary['modules']}",
            f"Recursos: {summary['resources']}",
            f"Campos de modelo: {summary['model_fields']}",
            f"Relacoes: {summary['relations']}",
            f"Acoes DRF customizadas: {summary['custom_actions']}",
            f"Aliases de serializer: {summary['serializer_aliases']}",
            f"Recursos sem ROLE_POLICY explicita: {summary['resources_without_role_policy']}",
            "",
            "Achados prioritarios:",
            findings,
        ]
    )


def _resource_contract(descriptor) -> dict[str, Any]:
    model = django_apps.get_model(descriptor.app_label, descriptor.model_name)
    viewset_class = viewset_for_descriptor(descriptor)
    serializer_class = getattr(viewset_class, "serializer_class", None) if viewset_class else None
    filterset_class = getattr(viewset_class, "filterset_class", None) if viewset_class else None

    actions = _action_contracts(viewset_class)
    model_contract = _model_contract(model)
    serializer_contract = _serializer_contract(serializer_class)
    filter_contract = _filter_contract(filterset_class)
    permissions = _permission_contract(descriptor.basename)

    return {
        "basename": descriptor.basename,
        "module": descriptor.prefix,
        "route_name": descriptor.route_name,
        "labels": {
            "pt": descriptor.label_pt,
            "en": descriptor.label_en,
            "module_pt": descriptor.module_label_pt,
            "module_en": descriptor.module_label_en,
        },
        "api": {
            "collection": descriptor.href,
            "detail": f"/api/v1/{descriptor.prefix}/{descriptor.route_name}/{{id}}/",
            "standard_actions": _standard_action_contracts(viewset_class),
        },
        "frontend": _frontend_contract(descriptor.prefix, descriptor.route_name),
        "model": model_contract,
        "serializer": serializer_contract,
        "filters": filter_contract,
        "viewset": {
            "class": _qualified_name(viewset_class),
            "search_fields": _tuple_strings(getattr(viewset_class, "search_fields", ())),
            "ordering_fields": _tuple_strings(getattr(viewset_class, "ordering_fields", ())),
            "default_ordering": _tuple_strings(getattr(viewset_class, "ordering", ())),
            "invalid_search_fields": _tuple_strings(getattr(viewset_class, "_invalid_search_fields", ())),
            "invalid_ordering_fields": _tuple_strings(getattr(viewset_class, "_invalid_ordering_fields", ())),
        },
        "actions": actions,
        "permissions": permissions,
        "ai_terms": {
            "keywords": list(descriptor.keywords),
            "module_aliases": list(MODULE_ALIASES.get(descriptor.prefix, ())),
            "resource_aliases": list(RESOURCE_ALIASES.get(descriptor.basename, ())),
            "serializer_input_aliases": serializer_contract["input_aliases"],
            "serializer_output_aliases": serializer_contract["output_aliases"],
            "has_curated_label": descriptor.basename in RESOURCE_LABELS,
            "has_curated_aliases": descriptor.basename in RESOURCE_ALIASES,
        },
    }


def _module_contracts(resources: list[dict[str, Any]]) -> list[dict[str, Any]]:
    grouped: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for resource in resources:
        grouped[resource["module"]].append(resource)

    direct_tools = _direct_tools_by_module()
    modules: list[dict[str, Any]] = []
    for module in sorted(VIEWSET_GROUPS.keys()):
        module_resources = sorted(grouped.get(module, []), key=lambda item: item["basename"])
        label_pt, label_en = MODULE_LABELS.get(module, (module.replace("_", " ").title(), module.replace("_", " ").title()))
        modules.append(
            {
                "key": module,
                "label_pt": label_pt,
                "label_en": label_en,
                "aliases": list(MODULE_ALIASES.get(module, ())),
                "resource_count": len(module_resources),
                "field_count": sum(len(resource["model"]["fields"]) for resource in module_resources),
                "relation_count": sum(len(resource["model"]["relations"]) for resource in module_resources),
                "action_count": sum(len(resource["actions"]) for resource in module_resources),
                "direct_ai_tools": direct_tools.get(module, []),
                "resource_basenames": [resource["basename"] for resource in module_resources],
                "frontend": _module_frontend_contract(module),
            }
        )
    return modules


def _model_contract(model: type[Model]) -> dict[str, Any]:
    fields = [_field_contract(field) for field in model._meta.get_fields() if _include_model_field(field)]
    relations = [field for field in fields if field["is_relation"]]
    return {
        "app_label": model._meta.app_label,
        "model_name": model.__name__,
        "model_label": model._meta.label,
        "db_table": model._meta.db_table,
        "verbose_name": str(model._meta.verbose_name),
        "verbose_name_plural": str(model._meta.verbose_name_plural),
        "fields": fields,
        "relations": relations,
        "has_tenant": any(field["name"] == "tenant" for field in fields),
        "has_deleted": any(field["name"] == "deleted" for field in fields),
        "has_soft_delete": any(field["name"] in {"deleted", "deleted_at"} for field in fields),
    }


def _include_model_field(field: Field) -> bool:
    return not (getattr(field, "auto_created", False) and not getattr(field, "concrete", False))


def _field_contract(field: Field) -> dict[str, Any]:
    related_model = getattr(field, "related_model", None)
    choices = list(getattr(field, "choices", ()) or ())
    return {
        "name": field.name,
        "attname": getattr(field, "attname", field.name),
        "type": field.get_internal_type() if hasattr(field, "get_internal_type") else field.__class__.__name__,
        "is_relation": bool(getattr(field, "is_relation", False)),
        "relation_model": getattr(getattr(related_model, "_meta", None), "label", "") if related_model else "",
        "many_to_many": bool(getattr(field, "many_to_many", False)),
        "many_to_one": bool(getattr(field, "many_to_one", False)),
        "one_to_one": bool(getattr(field, "one_to_one", False)),
        "primary_key": bool(getattr(field, "primary_key", False)),
        "unique": bool(getattr(field, "unique", False)),
        "null": bool(getattr(field, "null", False)),
        "blank": bool(getattr(field, "blank", False)),
        "editable": bool(getattr(field, "editable", True)),
        "max_length": getattr(field, "max_length", None),
        "choices_count": len(choices),
        "choices": _choice_contract(choices),
    }


def _choice_contract(choices: list[tuple[Any, Any]]) -> list[dict[str, str]]:
    if len(choices) > 30:
        return []
    return [{"value": str(value), "label": str(label)} for value, label in choices]


def _serializer_contract(serializer_class) -> dict[str, Any]:
    meta = getattr(serializer_class, "Meta", None) if serializer_class else None
    input_aliases = _alias_map(getattr(serializer_class, "legacy_input_aliases", {}) if serializer_class else {})
    output_aliases = _alias_map(getattr(serializer_class, "legacy_output_aliases", {}) if serializer_class else {})
    payload = {
        "class": _qualified_name(serializer_class),
        "meta_fields": _meta_fields(getattr(meta, "fields", ())),
        "read_only_fields": _tuple_strings(getattr(meta, "read_only_fields", ())),
        "input_aliases": input_aliases,
        "output_aliases": output_aliases,
        "alias_count": len(input_aliases) + len(output_aliases),
        "fields": [],
        "introspection_error": "",
    }
    if serializer_class is None:
        return payload

    try:
        serializer = serializer_class()
        payload["fields"] = [
            {
                "name": name,
                "class": field.__class__.__name__,
                "source": str(getattr(field, "source", "") or ""),
                "required": bool(getattr(field, "required", False)),
                "read_only": bool(getattr(field, "read_only", False)),
                "write_only": bool(getattr(field, "write_only", False)),
                "allow_null": bool(getattr(field, "allow_null", False)),
                "many": bool(getattr(field, "many", False)),
                "label": str(getattr(field, "label", "") or ""),
                "help_text": str(getattr(field, "help_text", "") or ""),
                "choices_count": len(getattr(field, "choices", {}) or {}),
            }
            for name, field in serializer.fields.items()
        ]
    except Exception as exc:
        payload["introspection_error"] = str(exc)
    return payload


def _filter_contract(filterset_class) -> dict[str, Any]:
    meta = getattr(filterset_class, "Meta", None) if filterset_class else None
    return {
        "class": _qualified_name(filterset_class),
        "filter_fields": _meta_fields(getattr(meta, "fields", ())),
    }


def _standard_action_contracts(viewset_class) -> list[dict[str, Any]]:
    contracts = []
    if viewset_class is None:
        return contracts
    for action_name, methods in STANDARD_ACTION_METHODS.items():
        if callable(getattr(viewset_class, action_name, None)):
            contracts.append({"name": action_name, "methods": list(methods)})
    return contracts


def _action_contracts(viewset_class) -> list[dict[str, Any]]:
    if viewset_class is None or not hasattr(viewset_class, "get_extra_actions"):
        return []
    try:
        extra_actions = viewset_class.get_extra_actions()
    except Exception:
        return []

    actions = []
    for action_func in extra_actions:
        mapping = getattr(action_func, "mapping", {}) or {}
        methods = sorted((str(method).upper() for method in mapping), key=_method_sort_key)
        name = getattr(action_func, "__name__", "")
        url_path = getattr(action_func, "url_path", "") or name
        detail = bool(getattr(action_func, "detail", False))
        actions.append(
            {
                "name": name,
                "url_path": url_path,
                "url_name": getattr(action_func, "url_name", "") or name.replace("_", "-"),
                "detail": detail,
                "methods": methods,
                "endpoint": "{detail}/" + url_path + "/" if detail else url_path + "/",
                "doc": inspect.getdoc(action_func) or "",
            }
        )
    return sorted(actions, key=lambda item: (item["url_path"], item["name"]))


def _permission_contract(basename: str) -> dict[str, Any]:
    normalized_labels = {normalize_group(label): label for label in GROUPS.values()}
    groups = []
    method_groups: dict[str, list[str]] = defaultdict(list)
    for group, resources in ROLE_POLICY.items():
        methods = resources.get(basename)
        if not methods:
            continue
        sorted_methods = sorted((str(method).upper() for method in methods), key=_method_sort_key)
        group_label = normalized_labels.get(group, group)
        groups.append(
            {
                "group": group_label,
                "normalized_group": group,
                "methods": sorted_methods,
                "can_read": bool(set(sorted_methods) & SAFE_METHODS),
                "can_write": bool(set(sorted_methods) & WRITE_METHODS),
                "can_delete": "DELETE" in sorted_methods,
            }
        )
        for method in sorted_methods:
            method_groups[method].append(group_label)

    for labels in method_groups.values():
        labels.sort()

    return {
        "admin_has_full_access": True,
        "groups": sorted(groups, key=lambda item: item["group"]),
        "method_groups": dict(sorted(method_groups.items())),
        "read_groups": sorted({item["group"] for item in groups if item["can_read"]}),
        "write_groups": sorted({item["group"] for item in groups if item["can_write"]}),
        "delete_groups": sorted({item["group"] for item in groups if item["can_delete"]}),
    }


def _tool_registry_contract() -> list[dict[str, Any]]:
    registry = AiToolRegistry()
    direct_tools = dict(DIRECT_TOOL_MODULES)
    return [
        {
            "name": tool.name,
            "mode": tool.mode,
            "description_pt": getattr(tool, "description_pt", ""),
            "description_en": getattr(tool, "description_en", ""),
            "required_groups": list(getattr(tool, "required_groups", ()) or ()),
            "direct_modules": list(direct_tools.get(tool.name, ())),
            "generic_capability": tool.name in GENERIC_AI_TOOLS,
        }
        for tool in sorted(registry.all(), key=lambda item: item.name)
    ]


def _direct_tools_by_module() -> dict[str, list[str]]:
    grouped: dict[str, list[str]] = defaultdict(list)
    for tool_name, modules in DIRECT_TOOL_MODULES.items():
        for module in modules:
            grouped[module].append(tool_name)
    return {module: sorted(tools) for module, tools in grouped.items()}


def _frontend_contract(module: str, route_name: str) -> dict[str, Any]:
    base_dir = Path(settings.BASE_DIR) / "frontend-next" / "app" / module
    candidates = _route_slug_candidates(route_name)
    matched = []
    if base_dir.exists():
        for page in base_dir.rglob("page.tsx"):
            normalized = str(page.relative_to(Path(settings.BASE_DIR) / "frontend-next" / "app")).replace("\\", "/")
            if any(candidate in normalized for candidate in candidates):
                matched.append(f"frontend-next/app/{normalized}")
    return {"matched_pages": sorted(matched)}


def _module_frontend_contract(module: str) -> dict[str, Any]:
    module_dir = Path(settings.BASE_DIR) / "frontend-next" / "app" / module
    if not module_dir.exists():
        return {"present": False, "page_count": 0}
    return {"present": True, "page_count": len(list(module_dir.rglob("page.tsx")))}


def _route_slug_candidates(route_name: str) -> set[str]:
    dashed = route_name.replace("_", "-")
    return {route_name, dashed, dashed + "s", route_name + "s"}


def _priority_findings(*, resources: list[dict[str, Any]], modules: list[dict[str, Any]]) -> list[str]:
    resources_without_policy = [resource["basename"] for resource in resources if not resource["permissions"]["groups"]]
    modules_without_aliases = [module["key"] for module in modules if not module["aliases"]]
    resources_without_aliases = [
        resource["basename"] for resource in resources if not resource["ai_terms"]["resource_aliases"]
    ]
    action_resources = [resource["basename"] for resource in resources if resource["actions"]]

    findings = [
        "O mapa canonico agora torna visiveis modulos, recursos, campos, filtros, acoes e permissoes num unico contrato.",
        "A IA deve consumir este mapa antes de escolher ferramenta, especialmente para palavras soltas e pedidos incompletos.",
    ]
    if resources_without_policy:
        findings.append(
            f"{len(resources_without_policy)} recursos nao aparecem explicitamente no ROLE_POLICY; primeiros: "
            f"{', '.join(resources_without_policy[:8])}."
        )
    if modules_without_aliases:
        findings.append(
            f"{len(modules_without_aliases)} modulos ainda nao possuem aliases canonicos; primeiros: "
            f"{', '.join(modules_without_aliases[:8])}."
        )
    if resources_without_aliases:
        findings.append(
            f"{len(resources_without_aliases)} recursos ainda nao possuem aliases canonicos; primeiros: "
            f"{', '.join(resources_without_aliases[:8])}."
        )
    if action_resources:
        findings.append(
            f"{len(action_resources)} recursos expoem acoes DRF customizadas que devem virar intents de workflow; primeiros: "
            f"{', '.join(action_resources[:8])}."
        )
    findings.append("A fase 3 deve consolidar aliases dispersos usando este mapa como fonte de verdade.")
    return findings


def _meta_fields(value: object) -> list[str]:
    if value is None:
        return []
    if value == "__all__":
        return ["__all__"]
    if isinstance(value, dict):
        return sorted(str(key) for key in value)
    if isinstance(value, (list, tuple, set)):
        return [str(item) for item in value]
    return [str(value)]


def _tuple_strings(value: object) -> list[str]:
    if value is None:
        return []
    if value == "__all__":
        return ["__all__"]
    if isinstance(value, (list, tuple, set)):
        return [str(item) for item in value]
    return [str(value)]


def _alias_map(value: object) -> dict[str, str]:
    if not isinstance(value, dict):
        return {}
    return {str(key): str(target) for key, target in sorted(value.items(), key=lambda item: str(item[0]))}


def _qualified_name(value: object) -> str:
    if value is None:
        return ""
    module = getattr(value, "__module__", "")
    name = getattr(value, "__name__", value.__class__.__name__)
    return f"{module}.{name}" if module else str(name)


def _method_sort_key(method: str) -> tuple[int, str]:
    method = str(method).upper()
    try:
        return (METHOD_ORDER.index(method), method)
    except ValueError:
        return (len(METHOD_ORDER), method)
