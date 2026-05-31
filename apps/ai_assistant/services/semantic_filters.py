from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, time, timedelta
import re
from typing import Any

from django.core.exceptions import FieldDoesNotExist
from django.db import models
from django.db.models import Q, QuerySet
from django.utils import timezone

from apps.ai_assistant.services.alias_normalization import normalize_alias_text
from apps.ai_assistant.tools.resource_catalog import ResourceDescriptor

DATE_PATTERN = r"\b(?:\d{4}-\d{1,2}-\d{1,2}|\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\b"

STATUS_FIELD_CANDIDATES = (
    "status",
    "workflow_status",
    "billing_status",
    "clinical_status",
    "state",
)

STATUS_REQUEST_TERMS: dict[str, tuple[str, ...]] = {
    "pending": ("pendente", "pendentes", "aguardando", "por pagar", "nao pago", "não pago", "pending"),
    "open": ("aberto", "aberta", "abertos", "abertas", "em aberto", "marcado", "marcada", "agendado", "agendada", "open"),
    "active": ("ativo", "ativa", "activa", "activo", "ativos", "ativas", "active"),
    "inactive": ("inativo", "inativa", "inactiva", "inactivo", "inactive"),
    "valid": ("valido", "valida", "válido", "válida", "validos", "válidos", "validas", "válidas", "valid"),
    "expired": ("expirado", "expirada", "expirados", "expiradas", "vencido", "vencida", "expired"),
    "paid": ("pago", "paga", "pagos", "pagas", "paid"),
    "issued": ("emitido", "emitida", "emitidos", "emitidas", "issued"),
    "draft": ("rascunho", "draft"),
    "completed": ("concluido", "concluído", "concluida", "concluída", "completo", "completed", "done"),
    "cancelled": ("cancelado", "cancelada", "cancelados", "canceladas", "canceled", "cancelled"),
    "in_progress": ("em execucao", "em execução", "em andamento", "a decorrer", "in progress"),
    "approved": ("aprovado", "aprovada", "aprovados", "aprovadas", "approved"),
    "requested": ("solicitado", "solicitada", "pedido", "requested"),
    "received": ("recebido", "recebida", "received"),
    "delivered": ("entregue", "delivered"),
}

STATUS_CHOICE_HINTS: dict[str, tuple[str, ...]] = {
    "pending": ("pending", "pendente", "aguard", "por pagar"),
    "open": ("open", "aberto", "aberta", "marcada", "marcado", "scheduled", "agendada", "agendado"),
    "active": ("active", "ativo", "ativa", "activo", "activa", "valido", "valida"),
    "inactive": ("inactive", "inativo", "inativa", "inactivo", "inactiva"),
    "valid": ("valid", "valido", "valida", "active"),
    "expired": ("expired", "expirado", "expirada", "vencido", "vencida"),
    "paid": ("paid", "pago", "paga"),
    "issued": ("issued", "emitido", "emitida", "emit"),
    "draft": ("draft", "rascunho", "rasc"),
    "completed": ("completed", "complete", "concluido", "concluida", "done"),
    "cancelled": ("cancel", "canc", "cancelado", "cancelada", "canceled", "cancelled"),
    "in_progress": ("in progress", "progress", "em execucao", "em andamento", "andamento"),
    "approved": ("approved", "aprovado", "aprovada"),
    "requested": ("requested", "solicitado", "solicitada", "pedido"),
    "received": ("received", "recebido", "recebida"),
    "delivered": ("delivered", "entregue"),
}


@dataclass(frozen=True, slots=True)
class SemanticFilterApplication:
    queryset: QuerySet
    applied_filters: tuple[dict[str, Any], ...]
    skipped_filters: tuple[dict[str, Any], ...]

    @property
    def has_filters(self) -> bool:
        return bool(self.applied_filters)


def apply_semantic_filters(
    *,
    queryset: QuerySet,
    message: str,
    descriptor: ResourceDescriptor | None = None,
) -> SemanticFilterApplication:
    normalized = normalize_alias_text(message)
    if not normalized:
        return SemanticFilterApplication(queryset=queryset, applied_filters=(), skipped_filters=())

    applied: list[dict[str, Any]] = []
    skipped: list[dict[str, Any]] = []
    blocked_fields: set[str] = set()
    handled_status_groups: set[str] = set()
    skip_date = False

    queryset, domain_blocked, domain_skip_date = _apply_domain_filters(
        queryset=queryset,
        normalized=normalized,
        descriptor=descriptor,
        applied=applied,
        skipped=skipped,
    )
    blocked_fields.update(domain_blocked)
    skip_date = skip_date or domain_skip_date
    if descriptor and descriptor.basename == "dental-patient_treatment_plan":
        if _has_group(normalized, "valid"):
            handled_status_groups.add("valid")
        if _has_group(normalized, "expired"):
            handled_status_groups.add("expired")

    queryset = _apply_http_status_filter(queryset=queryset, message=message, applied=applied)
    queryset, expiration_groups = _apply_expiration_state_filter(
        queryset=queryset,
        normalized=normalized,
        blocked_fields=blocked_fields,
        applied=applied,
    )
    handled_status_groups.update(expiration_groups)
    queryset = _apply_choice_status_filters(
        queryset=queryset,
        normalized=normalized,
        blocked_fields=blocked_fields,
        handled_groups=handled_status_groups,
        applied=applied,
        skipped=skipped,
    )
    queryset = _apply_boolean_filters(queryset=queryset, normalized=normalized, applied=applied)
    if not skip_date:
        queryset = _apply_date_filters(
            queryset=queryset,
            message=message,
            normalized=normalized,
            applied=applied,
            skipped=skipped,
        )

    return SemanticFilterApplication(
        queryset=queryset,
        applied_filters=tuple(applied),
        skipped_filters=tuple(skipped),
    )


def build_phase5_filter_report() -> dict[str, Any]:
    from django.apps import apps as django_apps

    from apps.ai_assistant.tools.resource_catalog import match_resource_descriptors

    probes = []
    for probe in PHASE5_PROBES:
        descriptor = next(iter(match_resource_descriptors(probe, limit=1)), None)
        if descriptor is None:
            probes.append({"input": probe, "resource": "", "applied_filters": [], "skipped_filters": []})
            continue
        model = django_apps.get_model(descriptor.app_label, descriptor.model_name)
        result = apply_semantic_filters(
            queryset=model._default_manager.all(),
            message=probe,
            descriptor=descriptor,
        )
        probes.append(
            {
                "input": probe,
                "resource": descriptor.basename,
                "module": descriptor.prefix,
                "applied_filters": list(result.applied_filters),
                "skipped_filters": list(result.skipped_filters),
            }
        )

    return {
        "phase": 5,
        "title": "Filtros semanticos de estado e periodo",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "summary": {
            "probes": len(probes),
            "probes_with_filters": sum(1 for probe in probes if probe["applied_filters"]),
            "filters_applied": sum(len(probe["applied_filters"]) for probe in probes),
            "filters_skipped": sum(len(probe["skipped_filters"]) for probe in probes),
        },
        "probes": probes,
        "priority_findings": _phase5_findings(probes),
    }


def render_phase5_filter_markdown(report: dict[str, Any]) -> str:
    summary = report["summary"]
    lines = [
        "# IA Operacional - Filtros Semanticos Fase 5",
        "",
        f"Gerado em UTC: {report['generated_at']}",
        "",
        "## Resumo",
        "",
        f"- Probes analisados: {summary['probes']}",
        f"- Probes com filtros reais: {summary['probes_with_filters']}",
        f"- Filtros aplicados: {summary['filters_applied']}",
        f"- Filtros ignorados: {summary['filters_skipped']}",
        "",
        "## Probes",
        "",
        "| Entrada | Recurso | Filtros aplicados |",
        "| --- | --- | --- |",
    ]
    for probe in report["probes"]:
        filters = ", ".join(_filter_summary(item) for item in probe["applied_filters"]) or "-"
        lines.append(f"| `{probe['input']}` | `{probe['resource'] or '-'}` | {filters} |")

    lines.extend(["", "## Achados Prioritarios", ""])
    lines.extend(f"- {finding}" for finding in report["priority_findings"])
    return "\n".join(lines).rstrip() + "\n"


def render_phase5_filter_text(report: dict[str, Any]) -> str:
    summary = report["summary"]
    findings = "\n".join(f"- {item}" for item in report["priority_findings"])
    return "\n".join(
        [
            "IA Operacional - Filtros Semanticos Fase 5",
            f"Gerado em UTC: {report['generated_at']}",
            "",
            f"Probes analisados: {summary['probes']}",
            f"Probes com filtros reais: {summary['probes_with_filters']}",
            f"Filtros aplicados: {summary['filters_applied']}",
            f"Filtros ignorados: {summary['filters_skipped']}",
            "",
            "Achados prioritarios:",
            findings,
        ]
    )


PHASE5_PROBES = (
    "planos dentarios validos",
    "planos dentarios expirados",
    "faturas pendentes",
    "consultas hoje",
    "consultas abertas",
    "erros 500",
    "funcionarios ativos",
    "lotes expirados",
)


def _apply_domain_filters(
    *,
    queryset: QuerySet,
    normalized: str,
    descriptor: ResourceDescriptor | None,
    applied: list[dict[str, Any]],
    skipped: list[dict[str, Any]],
) -> tuple[QuerySet, set[str], bool]:
    basename = descriptor.basename if descriptor else ""
    today = timezone.localdate()
    if basename == "dental-patient_treatment_plan":
        if _has_group(normalized, "valid"):
            applied.append(
                {
                    "kind": "domain_validity",
                    "field": "validity",
                    "operator": "valid_on",
                    "value": today.isoformat(),
                    "terms": _matched_terms(normalized, "valid"),
                }
            )
            return (
                queryset.filter(status="ACTIVE", valid_from__lte=today).filter(
                    Q(valid_until__isnull=True) | Q(valid_until__gte=today)
                ),
                {"status", "valid_from", "valid_until"},
                True,
            )
        if _has_group(normalized, "expired"):
            applied.append(
                {
                    "kind": "domain_validity",
                    "field": "validity",
                    "operator": "expired_on",
                    "value": today.isoformat(),
                    "terms": _matched_terms(normalized, "expired"),
                }
            )
            return (
                queryset.filter(Q(status="EXPIRED") | Q(valid_until__lt=today)),
                {"status", "valid_from", "valid_until"},
                True,
            )

    if basename == "billing-invoice" and _has_group(normalized, "pending"):
        field = _model_field(queryset.model, "status")
        excluded = _choice_values_for_groups(field, ("paid", "cancelled")) if field else ()
        if excluded:
            applied.append(
                {
                    "kind": "domain_pending_status",
                    "field": "status",
                    "operator": "not_in",
                    "values": list(excluded),
                    "terms": _matched_terms(normalized, "pending"),
                }
            )
            return queryset.exclude(status__in=excluded), {"status"}, False
        skipped.append({"kind": "domain_pending_status", "reason": "status_choices_not_found"})

    return queryset, set(), False


def _apply_http_status_filter(*, queryset: QuerySet, message: str, applied: list[dict[str, Any]]) -> QuerySet:
    if _model_field(queryset.model, "status_code") is None:
        return queryset
    values = tuple(dict.fromkeys(int(item) for item in re.findall(r"\b[1-5]\d{2}\b", message or "")))
    if not values:
        return queryset
    applied.append(
        {
            "kind": "http_status",
            "field": "status_code",
            "operator": "in",
            "values": list(values),
        }
    )
    return queryset.filter(status_code__in=values)


def _apply_choice_status_filters(
    *,
    queryset: QuerySet,
    normalized: str,
    blocked_fields: set[str],
    handled_groups: set[str],
    applied: list[dict[str, Any]],
    skipped: list[dict[str, Any]],
) -> QuerySet:
    groups = tuple(group for group in _detected_status_groups(normalized) if group not in handled_groups)
    if not groups:
        return queryset

    skipped_blocked_field = False
    for field_name in STATUS_FIELD_CANDIDATES:
        if field_name in blocked_fields:
            skipped_blocked_field = True
            continue
        field = _model_field(queryset.model, field_name)
        if field is None or not getattr(field, "choices", None):
            continue
        values = _choice_values_for_groups(field, groups)
        if not values:
            continue
        applied.append(
            {
                "kind": "semantic_status",
                "field": field_name,
                "operator": "in",
                "values": list(values),
                "groups": list(groups),
                "terms": sorted({term for group in groups for term in _matched_terms(normalized, group)}),
            }
        )
        return queryset.filter(**{f"{field_name}__in": values})

    if skipped_blocked_field:
        return queryset
    skipped.append({"kind": "semantic_status", "groups": list(groups), "reason": "compatible_status_field_not_found"})
    return queryset


def _apply_expiration_state_filter(
    *,
    queryset: QuerySet,
    normalized: str,
    blocked_fields: set[str],
    applied: list[dict[str, Any]],
) -> tuple[QuerySet, tuple[str, ...]]:
    field = next(
        (
            candidate
            for candidate in ("expiration_date", "expiry_date", "expires_at", "valid_until")
            if candidate not in blocked_fields and _model_field(queryset.model, candidate) is not None
        ),
        "",
    )
    if not field:
        return queryset, ()
    today = timezone.localdate()
    if _has_group(normalized, "expired"):
        applied.append(
            {
                "kind": "semantic_expiration",
                "field": field,
                "operator": "lt",
                "value": today.isoformat(),
                "terms": _matched_terms(normalized, "expired"),
            }
        )
        return queryset.filter(**{f"{field}__lt": today}), ("expired",)
    if _has_group(normalized, "valid"):
        applied.append(
            {
                "kind": "semantic_expiration",
                "field": field,
                "operator": "gte_or_null",
                "value": today.isoformat(),
                "terms": _matched_terms(normalized, "valid"),
            }
        )
        return queryset.filter(Q(**{f"{field}__isnull": True}) | Q(**{f"{field}__gte": today})), ("valid",)
    return queryset, ()


def _apply_boolean_filters(*, queryset: QuerySet, normalized: str, applied: list[dict[str, Any]]) -> QuerySet:
    field = _model_field(queryset.model, "active")
    if field is None or not isinstance(field, models.BooleanField):
        return queryset
    if _has_group(normalized, "active"):
        applied.append({"kind": "semantic_boolean", "field": "active", "operator": "exact", "value": True})
        return queryset.filter(active=True)
    if _has_group(normalized, "inactive"):
        applied.append({"kind": "semantic_boolean", "field": "active", "operator": "exact", "value": False})
        return queryset.filter(active=False)
    return queryset


def _apply_date_filters(
    *,
    queryset: QuerySet,
    message: str,
    normalized: str,
    applied: list[dict[str, Any]],
    skipped: list[dict[str, Any]],
) -> QuerySet:
    date_range = _extract_date_range(message)
    if date_range is None:
        return queryset
    start, end, label = date_range
    field = _select_date_field(model=queryset.model, normalized=normalized)
    if field is None:
        skipped.append({"kind": "date_range", "label": label, "reason": "date_field_not_found"})
        return queryset

    start_value, end_value = _bounds_for_field(field=field, start=start, end=end)
    applied.append(
        {
            "kind": "date_range",
            "field": field.name,
            "operator": "between",
            "start": start.isoformat(),
            "end": end.isoformat(),
            "label": label,
        }
    )
    return queryset.filter(**{f"{field.name}__gte": start_value, f"{field.name}__lte": end_value})


def _extract_date_range(message: str) -> tuple[date, date, str] | None:
    normalized = normalize_alias_text(message)
    today = timezone.localdate()
    explicit_dates = []
    for raw in re.findall(DATE_PATTERN, message or "", flags=re.IGNORECASE):
        parsed = _parse_date(raw)
        if parsed and parsed not in explicit_dates:
            explicit_dates.append(parsed)
    if explicit_dates:
        start = explicit_dates[0]
        end = explicit_dates[1] if len(explicit_dates) > 1 else explicit_dates[0]
        if start > end:
            start, end = end, start
        return start, end, "explicit"

    rolling_days = re.search(r"\b(?:ultimos|ultimas|últimos|últimas|last)\s+(?P<days>\d{1,3})\s+(?:dias|days|d)\b", message or "", flags=re.IGNORECASE)
    if rolling_days:
        days = max(1, min(int(rolling_days.group("days")), 365))
        return today - timedelta(days=days - 1), today, f"last_{days}_days"

    if _contains_term(normalized, "hoje") or _contains_term(normalized, "today"):
        return today, today, "today"
    if _contains_term(normalized, "ontem") or _contains_term(normalized, "yesterday"):
        value = today - timedelta(days=1)
        return value, value, "yesterday"
    if _contains_term(normalized, "anteontem") or "antes de ontem" in normalized:
        value = today - timedelta(days=2)
        return value, value, "two_days_ago"
    if "este mes" in normalized or "mes corrente" in normalized or "this month" in normalized:
        return today.replace(day=1), today, "this_month"
    if "mes passado" in normalized or "last month" in normalized:
        first_this_month = today.replace(day=1)
        end = first_this_month - timedelta(days=1)
        return end.replace(day=1), end, "last_month"
    return None


def _parse_date(raw: str) -> date | None:
    raw = (raw or "").strip()
    iso = re.fullmatch(r"(?P<year>\d{4})-(?P<month>\d{1,2})-(?P<day>\d{1,2})", raw)
    if iso:
        try:
            return date(int(iso.group("year")), int(iso.group("month")), int(iso.group("day")))
        except ValueError:
            return None
    local = re.fullmatch(r"(?P<day>\d{1,2})[/-](?P<month>\d{1,2})[/-](?P<year>\d{2,4})", raw)
    if local:
        year = int(local.group("year"))
        if year < 100:
            year += 2000
        try:
            return date(year, int(local.group("month")), int(local.group("day")))
        except ValueError:
            return None
    return None


def _select_date_field(*, model: type[models.Model], normalized: str) -> models.Field | None:
    priority: list[str] = []
    if any(term in normalized for term in ("consulta", "consultas", "agenda", "agendado", "agendada", "marcado", "marcada", "scheduled")):
        priority.extend(["scheduled_for", "scheduled_start", "scheduled_at", "scheduled_date"])
    if any(term in normalized for term in ("aberto", "aberta", "abertura")):
        priority.extend(["opened_at", "created_at"])
    if any(term in normalized for term in ("fechado", "fechada", "concluido", "concluida", "completed")):
        priority.extend(["closed_at", "completed_at", "completed_date"])
    if any(term in normalized for term in ("criado", "criada", "criados", "criadas", "created")):
        priority.append("created_at")
    if any(term in normalized for term in ("actualizado", "atualizado", "updated")):
        priority.append("updated_at")
    if any(term in normalized for term in ("pago", "pagamento", "paid")):
        priority.append("paid_at")
    if any(term in normalized for term in ("emitido", "emitida", "fatura", "factura", "invoice", "issued")):
        priority.append("issued_at")

    fallback = [
        "scheduled_for",
        "scheduled_start",
        "scheduled_at",
        "scheduled_date",
        "opened_at",
        "arrived_at",
        "created_at",
        "valid_from",
        "paid_at",
        "issued_at",
        "performed_at",
        "performed_date",
        "date",
        "updated_at",
    ]
    for name in [*priority, *fallback]:
        field = _model_field(model, name)
        if field is not None and isinstance(field, (models.DateField, models.DateTimeField)):
            return field
    return None


def _bounds_for_field(*, field: models.Field, start: date, end: date) -> tuple[Any, Any]:
    if isinstance(field, models.DateTimeField):
        current_tz = timezone.get_current_timezone()
        return (
            timezone.make_aware(datetime.combine(start, time.min), current_tz),
            timezone.make_aware(datetime.combine(end, time.max), current_tz),
        )
    return start, end


def _choice_values_for_groups(field: models.Field, groups: tuple[str, ...]) -> tuple[Any, ...]:
    values = []
    for value, label in getattr(field, "choices", ()) or ():
        haystack = normalize_alias_text(f"{value} {label}")
        for group in groups:
            if any(_contains_term(haystack, hint) for hint in STATUS_CHOICE_HINTS.get(group, ())):
                values.append(value)
                break
    return tuple(dict.fromkeys(values))


def _detected_status_groups(normalized: str) -> tuple[str, ...]:
    return tuple(group for group in STATUS_REQUEST_TERMS if _has_group(normalized, group))


def _has_group(normalized: str, group: str) -> bool:
    return any(_contains_term(normalized, term) for term in STATUS_REQUEST_TERMS.get(group, ()))


def _matched_terms(normalized: str, group: str) -> tuple[str, ...]:
    return tuple(term for term in STATUS_REQUEST_TERMS.get(group, ()) if _contains_term(normalized, term))


def _contains_term(normalized: str, raw_term: str) -> bool:
    term = normalize_alias_text(raw_term)
    if not term:
        return False
    return bool(re.search(rf"(?<!\w){re.escape(term)}(?!\w)", normalized))


def _model_field(model: type[models.Model], field_name: str) -> models.Field | None:
    try:
        return model._meta.get_field(field_name)
    except FieldDoesNotExist:
        return None


def _filter_summary(item: dict[str, Any]) -> str:
    field = item.get("field") or item.get("kind") or "filtro"
    operator = item.get("operator") or "aplicado"
    values = item.get("values")
    if values:
        return f"{field} {operator} {values}"
    if "value" in item:
        return f"{field} {operator} {item['value']}"
    if "start" in item and "end" in item:
        return f"{field} {operator} {item['start']}..{item['end']}"
    return f"{field} {operator}"


def _phase5_findings(probes: list[dict[str, Any]]) -> list[str]:
    findings = [
        "Termos de estado e periodo agora geram filtros de queryset auditaveis antes da contagem e amostra segura.",
        "A validade de planos dentarios usa regra de dominio: status ACTIVE, inicio <= hoje e fim nulo ou futuro.",
        "Faturas pendentes usam regra operacional: excluir pagas e canceladas quando o modelo nao tem status PENDING.",
    ]
    without_filters = [probe["input"] for probe in probes if not probe["applied_filters"]]
    if without_filters:
        findings.append("Probes sem filtro real nesta fase: " + ", ".join(without_filters) + ".")
    findings.append("A fase 6 deve usar pontuacao semantica e historico de conversa para desambiguar termos como stock.")
    return findings
