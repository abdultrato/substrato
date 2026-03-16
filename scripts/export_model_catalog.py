#!/usr/bin/env python3
"""
Exporta um catalogo "fonte de verdade" dos modelos Django (fields, relacoes, choices)
para alinhar frontend <-> backend e reduzir divergencias.

Uso (recomendado):
  .venv/bin/python scripts/export_model_catalog.py

Saidas (por default):
  - frontend-next/model_catalog.json
  - frontend-next/MODEL_CATALOG.md
"""

from __future__ import annotations

import argparse
import contextlib
from dataclasses import dataclass
import json
import os
from pathlib import Path
import sys
from typing import Any

ROOT = Path(__file__).resolve().parent.parent
# Rodando como "python scripts/..." faz o sys.path[0] apontar para /scripts.
# Garantimos que o root do projeto esteja no path para importar "plataforma", "aplicativos", etc.
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))


def _safe_str(v: Any) -> str:
    if v is None:
        return ""
    try:
        return str(v)
    except Exception:
        return repr(v)


def _is_optgroup(choice_value: Any, choice_label: Any) -> bool:
    # Optgroup format: ("Grupo", (("v1","l1"), ...))
    if not isinstance(choice_value, str):
        return False
    if not isinstance(choice_label, (list, tuple)):
        return False
    if len(choice_label) == 0:
        return False
    first = choice_label[0]
    return isinstance(first, (list, tuple)) and len(first) == 2


def _normalize_choices(choices: Any) -> dict[str, Any]:
    """
    Retorna:
      - choices_flat: [{value,label}, ...]
      - choices_groups: [{group, choices:[...]}] (opcional)
      - choices_count: int
    """
    if not choices:
        return {"choices_flat": [], "choices_groups": [], "choices_count": 0}

    flat: list[dict[str, Any]] = []
    groups: list[dict[str, Any]] = []

    try:
        for v, label in list(choices):
            if _is_optgroup(v, label):
                group_items: list[dict[str, Any]] = []
                for vv, ll in list(label):
                    item = {"value": vv, "label": _safe_str(ll)}
                    flat.append(item)
                    group_items.append(item)
                groups.append({"group": v, "choices": group_items})
            else:
                item = {"value": v, "label": _safe_str(label)}
                flat.append(item)
    except Exception:
        # Worst case: just stringify and move on.
        return {"choices_flat": [], "choices_groups": [], "choices_count": 0}

    return {"choices_flat": flat, "choices_groups": groups, "choices_count": len(flat)}


def _field_default_repr(field: Any) -> str | None:
    try:
        default = field.default
    except Exception:
        return None

    if default is None:
        return None

    # Django sentinel objects / callables.
    try:
        if callable(default):
            return getattr(default, "__name__", "callable")
    except Exception:
        return "callable"

    # Basic json-safe values.
    if isinstance(default, (str, int, float, bool)):
        return default  # type: ignore[return-value]

    return _safe_str(default)


def _field_info(field: Any) -> dict[str, Any]:
    from django.db import models as dj_models

    info: dict[str, Any] = {
        "name": getattr(field, "name", None),
        "attname": getattr(field, "attname", None),
        "verbose_name": _safe_str(getattr(field, "verbose_name", "")),
        "type": field.__class__.__name__,
        "null": bool(getattr(field, "null", False)),
        "blank": bool(getattr(field, "blank", False)),
        "primary_key": bool(getattr(field, "primary_key", False)),
        "unique": bool(getattr(field, "unique", False)),
        "db_index": bool(getattr(field, "db_index", False)),
        "editable": bool(getattr(field, "editable", True)),
        "help_text": _safe_str(getattr(field, "help_text", "")),
        "default": _field_default_repr(field),
    }

    # Common per-field attrs (only when present)
    for k in ("max_length", "max_digits", "decimal_places"):
        if hasattr(field, k):
            with contextlib.suppress(Exception):
                info[k] = getattr(field, k)

    if hasattr(field, "choices"):
        choices_meta = _normalize_choices(field.choices)
        info.update(choices_meta)

    # Relations
    if isinstance(field, (dj_models.ForeignKey, dj_models.OneToOneField)):
        rel_model = None
        try:
            rel_model = field.remote_field.model
        except Exception:
            rel_model = None
        info["relation"] = {
            "kind": "fk" if isinstance(field, dj_models.ForeignKey) else "one_to_one",
            "to": getattr(getattr(rel_model, "_meta", None), "label", None),
            "to_app_label": getattr(getattr(rel_model, "_meta", None), "app_label", None),
            "to_model": getattr(getattr(rel_model, "_meta", None), "model_name", None),
            "related_name": getattr(field.remote_field, "related_name", None),
        }

    if isinstance(field, dj_models.ManyToManyField):
        rel_model = None
        try:
            rel_model = field.remote_field.model
        except Exception:
            rel_model = None
        info["relation"] = {
            "kind": "many_to_many",
            "to": getattr(getattr(rel_model, "_meta", None), "label", None),
            "to_app_label": getattr(getattr(rel_model, "_meta", None), "app_label", None),
            "to_model": getattr(getattr(rel_model, "_meta", None), "model_name", None),
            "related_name": getattr(field.remote_field, "related_name", None),
            "through": getattr(getattr(field.remote_field, "through", None), "__name__", None),
        }

    # File/Image specifics
    if isinstance(field, (dj_models.FileField, dj_models.ImageField)):
        try:
            upload_to = getattr(field, "upload_to", None)
            if callable(upload_to):
                info["upload_to"] = getattr(upload_to, "__name__", "callable")
            else:
                info["upload_to"] = _safe_str(upload_to)
        except Exception:
            pass

    return info


def _model_info(model: Any) -> dict[str, Any]:
    m = model
    meta = m._meta

    # Local concrete fields + local M2M (exclude reverse relations).
    # Inclui a PK auto-gerada (ex.: "id"), pois ela existe na API e no BD.
    fields = []
    for f in meta.get_fields():
        # Exclui apenas reverse relations.
        if getattr(f, "auto_created", False) and not getattr(f, "concrete", False):
            continue

        if getattr(f, "concrete", False):
            fields.append(f)
            continue

        # M2M forward declarado no model (exclui through auto-gerado).
        if getattr(f, "many_to_many", False) and not getattr(f, "auto_created", False):
            fields.append(f)

    # Sort for stability
    fields_sorted = sorted(fields, key=lambda x: _safe_str(getattr(x, "name", "")))
    out_fields = [_field_info(f) for f in fields_sorted]

    return {
        "app_label": meta.app_label,
        "model": m.__name__,
        "label": meta.label,
        "label_lower": meta.label_lower,
        "module": m.__module__,
        "db_table": meta.db_table,
        "managed": bool(meta.managed),
        "abstract": bool(meta.abstract),
        "proxy": bool(meta.proxy),
        "verbose_name": _safe_str(meta.verbose_name),
        "verbose_name_plural": _safe_str(meta.verbose_name_plural),
        "fields_count": len(out_fields),
        "fields": out_fields,
    }


@dataclass(frozen=True)
class Outputs:
    json_path: Path
    md_path: Path


def _write_md(catalog: dict[str, Any], out: Outputs) -> None:
    lines: list[str] = []
    lines.append("# Catalogo de Models (Backend)\n")
    lines.append("Fonte de verdade para alinhar frontend <-> backend.\n")
    lines.append("")
    lines.append("## Como regenerar\n")
    lines.append("```bash")
    lines.append(".venv/bin/python scripts/export_model_catalog.py")
    lines.append("```")
    lines.append("")
    lines.append(f"- JSON: `{out.json_path}`")
    lines.append("")

    apps = catalog.get("apps") or []
    totals = catalog.get("totals") or {}
    lines.append("## Totais\n")
    lines.append(f"- apps: {totals.get('apps', 0)}")
    lines.append(f"- models: {totals.get('models', 0)}")
    lines.append(f"- fields: {totals.get('fields', 0)}")
    lines.append(f"- fields_com_choices: {totals.get('fields_with_choices', 0)}")
    lines.append(f"- choices_total_itens: {totals.get('choices_total_items', 0)}")
    lines.append("")

    lines.append("## Por app/model\n")
    for app in apps:
        app_label = app.get("app_label") or ""
        lines.append(f"### {app_label}\n")
        for model in app.get("models") or []:
            lines.append(f"#### {model.get('label')}\n")
            lines.append(f"- verbose_name: {_safe_str(model.get('verbose_name'))}")
            lines.append(f"- db_table: {_safe_str(model.get('db_table'))}")
            lines.append(f"- fields: {model.get('fields_count')}")
            lines.append("")
            lines.append("| field | type | required | relation | choices |")
            lines.append("| --- | --- | --- | --- | --- |")
            for f in model.get("fields") or []:
                name = _safe_str(f.get("name"))
                ftype = _safe_str(f.get("type"))
                required = "nao" if (f.get("null") or f.get("blank")) else "sim"
                rel = ""
                r = f.get("relation")
                if isinstance(r, dict):
                    rel = f"{_safe_str(r.get('kind'))}:{_safe_str(r.get('to'))}"
                choices_count = f.get("choices_count") or 0
                lines.append(f"| {name} | {ftype} | {required} | {rel} | {choices_count} |")
            lines.append("")

            # Explicita as choices (value/label) para compatibilidade frontend<->backend.
            fields_with_choices = [f for f in (model.get("fields") or []) if (f.get("choices_count") or 0) > 0]
            if fields_with_choices:
                lines.append("**Choices**")
                for f in fields_with_choices:
                    fname = _safe_str(f.get("name"))
                    ch = f.get("choices_flat") or []
                    parts: list[str] = []
                    for item in ch:
                        v = _safe_str(item.get("value"))
                        label = _safe_str(item.get("label"))
                        parts.append(f"`{v}`={label}")
                    lines.append(f"- {fname} ({len(ch)}): " + "; ".join(parts))
                lines.append("")

    out.md_path.write_text("\n".join(lines), encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--prefix",
        default="aplicativos.",
        help="Prefixo de apps a incluir (default: aplicativos.)",
    )
    parser.add_argument(
        "--json",
        default=str(ROOT / "frontend-next" / "model_catalog.json"),
        help="Caminho de saida JSON",
    )
    parser.add_argument(
        "--md",
        default=str(ROOT / "frontend-next" / "MODEL_CATALOG.md"),
        help="Caminho de saida Markdown",
    )
    args = parser.parse_args()

    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "plataforma.settings")

    import django

    django.setup()

    from django.apps import apps as django_apps

    prefix = (args.prefix or "").strip()
    json_path = Path(args.json).resolve()
    md_path = Path(args.md).resolve()
    out = Outputs(json_path=json_path, md_path=md_path)

    models = []
    for m in django_apps.get_models():
        module = getattr(m, "__module__", "") or ""
        if prefix and not module.startswith(prefix):
            continue
        models.append(m)

    models_sorted = sorted(models, key=lambda m: (m._meta.app_label, m._meta.model_name))

    apps_map: dict[str, list[dict[str, Any]]] = {}
    totals = {"apps": 0, "models": 0, "fields": 0, "fields_with_choices": 0, "choices_total_items": 0}

    for m in models_sorted:
        mi = _model_info(m)
        totals["models"] += 1
        totals["fields"] += int(mi.get("fields_count") or 0)
        for f in mi.get("fields") or []:
            if (f.get("choices_count") or 0) > 0:
                totals["fields_with_choices"] += 1
                totals["choices_total_items"] += int(f.get("choices_count") or 0)
        apps_map.setdefault(mi["app_label"], []).append(mi)

    apps_list = [{"app_label": k, "models": v, "models_count": len(v)} for k, v in sorted(apps_map.items())]
    totals["apps"] = len(apps_list)

    catalog = {
        "generated_at": __import__("datetime").datetime.now().isoformat(timespec="seconds"),
        "prefix_filter": prefix,
        "totals": totals,
        "apps": apps_list,
    }

    json_path.parent.mkdir(parents=True, exist_ok=True)
    md_path.parent.mkdir(parents=True, exist_ok=True)

    # keep ASCII for portability (PT labels remain exact via \\u escapes)
    json_path.write_text(json.dumps(catalog, indent=2, ensure_ascii=True), encoding="utf-8")
    _write_md(catalog, out)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
