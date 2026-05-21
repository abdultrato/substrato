from __future__ import annotations

import re
from dataclasses import dataclass
from datetime import date, datetime, time
from typing import Any

from django.apps import apps as django_apps
from django.db import connection, models
from django.utils import timezone

from apps.ai_assistant.tools.resource_catalog import (
    RESOURCE_ALIASES,
    ResourceDescriptor,
    descriptor_by_basename,
    match_resource_descriptors,
    normalize_text,
    user_can_read_resource,
)

from .base import AiTool, AiToolContext


DATE_PATTERN = r"\b(?:\d{4}-\d{1,2}-\d{1,2}|\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\b"


@dataclass(frozen=True, slots=True)
class ParsedAnalyticQuery:
    kind: str
    start_date: date | None = None
    end_date: date | None = None
    product_query: str = ""
    resource_basename: str = ""
    search_query: str = ""


class SqlAnalyticsTool(AiTool):
    name = "run_sql_analytics"
    description_pt = "Executa pesquisas analíticas por SQL parametrizado para perguntas de datas, contagens, listagens e stock histórico."
    description_en = "Runs parameterized SQL analytics for date ranges, counts, lists and historical stock questions."
    required_groups: tuple[str, ...] = ()
    mode = "read"

    def run(self, context: AiToolContext) -> dict[str, Any]:
        message = str(context.arguments.get("message") or "")
        parsed = self._parse(message=message, active_module=context.active_module)
        if parsed.kind == "patient_entries_between":
            return self._patient_entries_between(context=context, parsed=parsed)
        if parsed.kind == "pharmacy_stock_as_of":
            return self._pharmacy_stock_as_of(context=context, parsed=parsed)
        if parsed.kind == "generic_resource_query":
            return self._generic_resource_query(context=context, parsed=parsed, message=message)
        return self._no_match(language=context.language)

    def _parse(self, *, message: str, active_module: str = "") -> ParsedAnalyticQuery:
        normalized = normalize_text(message)
        dates = self._extract_dates(message)

        patient_entry_terms = (
            "paciente" in normalized
            and any(term in normalized for term in ("entrada", "entraram", "deram entrada", "checkin", "check in", "check-in", "admitidos"))
            and dates
        )
        if patient_entry_terms:
            return ParsedAnalyticQuery(
                kind="patient_entries_between",
                start_date=dates[0],
                end_date=dates[1] if len(dates) > 1 else timezone.localdate(),
            )

        stock_terms = any(term in normalized for term in ("estoque", "stock", "saldo"))
        pharmacy_terms = any(term in normalized for term in ("medicacao", "medicação", "medicamento", "produto", "farmaco", "fármaco", "farmacia", "farmácia"))
        historical_terms = any(term in normalized for term in ("no dia", "na data", "em ", "era", "tinha", "havia", "historico", "histórico"))
        if stock_terms and pharmacy_terms and historical_terms and dates:
            return ParsedAnalyticQuery(
                kind="pharmacy_stock_as_of",
                start_date=dates[0],
                end_date=dates[0],
                product_query=self._extract_product_query(message),
            )

        if _has_crud_intent(normalized):
            return ParsedAnalyticQuery(kind="")

        descriptor = _best_specific_descriptor(message)
        if descriptor and _has_generic_analytic_intent(normalized=normalize_text(f"{message} {active_module}"), dates=dates):
            end_date = None
            if dates:
                if len(dates) > 1:
                    end_date = dates[1]
                elif any(term in normalized for term in ("a partir", "desde", "from")):
                    end_date = timezone.localdate()
                else:
                    end_date = dates[0]
            return ParsedAnalyticQuery(
                kind="generic_resource_query",
                start_date=dates[0] if dates else None,
                end_date=end_date,
                resource_basename=descriptor.basename,
                search_query=self._extract_generic_search_query(message=message, descriptor=descriptor),
            )

        return ParsedAnalyticQuery(kind="")

    def _patient_entries_between(self, *, context: AiToolContext, parsed: ParsedAnalyticQuery) -> dict[str, Any]:
        if not user_can_read_resource(user=context.user, basename="reception-checkin"):
            return self._access_denied(
                language=context.language,
                resources=[("reception-checkin", "Check-ins de recepção", "Reception check-ins")],
            )

        effective_start = parsed.start_date
        effective_end = parsed.end_date or parsed.start_date
        start_dt = _start_of_day(effective_start)
        end_dt = _end_of_day(effective_end)
        if start_dt > end_dt:
            effective_start, effective_end = effective_end, effective_start
            start_dt, end_dt = _start_of_day(effective_start), _end_of_day(effective_end)

        rows = self._fetchall(
            """
            SELECT
                COUNT(*) AS checkin_count,
                COUNT(DISTINCT patient_id) AS distinct_patient_count,
                SUM(CASE WHEN status = 'AGUARD' THEN 1 ELSE 0 END) AS waiting_count,
                SUM(CASE WHEN status = 'ATEND' THEN 1 ELSE 0 END) AS in_care_count,
                SUM(CASE WHEN status = 'CONC' THEN 1 ELSE 0 END) AS completed_count,
                SUM(CASE WHEN status = 'CANC' THEN 1 ELSE 0 END) AS canceled_count
            FROM recepcao_checkinrecepcao
            WHERE tenant_id = %s
              AND deleted = %s
              AND arrived_at BETWEEN %s AND %s
            """,
            [context.tenant.id, False, start_dt, end_dt],
        )
        totals = rows[0] if rows else {}
        daily_rows = self._fetchall(
            """
            SELECT DATE(arrived_at) AS day, COUNT(*) AS checkin_count, COUNT(DISTINCT patient_id) AS distinct_patient_count
            FROM recepcao_checkinrecepcao
            WHERE tenant_id = %s
              AND deleted = %s
              AND arrived_at BETWEEN %s AND %s
            GROUP BY DATE(arrived_at)
            ORDER BY day ASC
            """,
            [context.tenant.id, False, start_dt, end_dt],
        )
        recent_rows = self._fetchall(
            """
            SELECT c.id, c.custom_id, c.arrived_at, c.status, c.priority, p.custom_id AS patient_code, p.name AS patient_name
            FROM recepcao_checkinrecepcao c
            JOIN clinico_paciente p ON p.id = c.patient_id
            WHERE c.tenant_id = %s
              AND c.deleted = %s
              AND c.arrived_at BETWEEN %s AND %s
            ORDER BY c.arrived_at DESC, c.id DESC
            LIMIT 5
            """,
            [context.tenant.id, False, start_dt, end_dt],
        )

        return {
            "summary": {
                "title_pt": "Pesquisa SQL de entradas de pacientes",
                "title_en": "SQL patient admission analytics",
                "metrics": [
                    {"label_pt": "Entradas no período", "label_en": "Admissions in range", "value": int(totals.get("checkin_count") or 0)},
                    {"label_pt": "Pacientes distintos", "label_en": "Distinct patients", "value": int(totals.get("distinct_patient_count") or 0)},
                    {"label_pt": "Aguardando", "label_en": "Waiting", "value": int(totals.get("waiting_count") or 0)},
                    {"label_pt": "Concluídos", "label_en": "Completed", "value": int(totals.get("completed_count") or 0)},
                ],
                "query_kind": "patient_entries_between",
                "range": {"start_date": effective_start.isoformat(), "end_date": effective_end.isoformat()},
                "daily_rows": daily_rows,
                "recent_rows": [_safe_recent_checkin(row) for row in recent_rows],
                "sql_templates": ["patient_entries_between_totals", "patient_entries_between_daily", "patient_entries_between_recent"],
            },
            "analytics": {
                "query_kind": "patient_entries_between",
                "range": {"start_date": effective_start.isoformat(), "end_date": effective_end.isoformat()},
                "totals": totals,
                "daily_rows": daily_rows,
                "recent_rows": [_safe_recent_checkin(row) for row in recent_rows],
            },
            "sources": [
                {"type": "sql_template", "label": "patient_entries_between", "href": ""},
                {"type": "model", "label": "ReceptionCheckin", "href": "/reception/checkin"},
                {"type": "policy", "label": "RBAC", "href": ""},
            ],
        }

    def _pharmacy_stock_as_of(self, *, context: AiToolContext, parsed: ParsedAnalyticQuery) -> dict[str, Any]:
        if not user_can_read_resource(user=context.user, basename="pharmacy-lot"):
            return self._access_denied(
                language=context.language,
                resources=[("pharmacy-lot", "Lotes de farmácia", "Pharmacy lots")],
            )

        as_of_date = parsed.end_date or parsed.start_date
        as_of_dt = _end_of_day(as_of_date)
        product_query = (parsed.product_query or "").strip()
        if not product_query:
            return self._needs_more(
                language=context.language,
                prompt_pt="Indique o nome, código ou parte do nome do medicamento/produto.",
                prompt_en="Provide the medication/product name, code or partial name.",
            )

        product_like = f"%{product_query}%"
        rows = self._fetchall(
            """
            WITH matched_products AS (
                SELECT id, custom_id, name, sale_price
                FROM farmacia_produto
                WHERE tenant_id = %s
                  AND deleted = %s
                  AND (LOWER(name) LIKE LOWER(%s) OR LOWER(COALESCE(custom_id, '')) LIKE LOWER(%s))
                ORDER BY
                  CASE
                    WHEN LOWER(name) = LOWER(%s) THEN 0
                    WHEN LOWER(name) LIKE LOWER(%s) THEN 1
                    ELSE 2
                  END,
                  name ASC
                LIMIT 8
            ),
            lot_balances AS (
                SELECT
                    p.id AS product_id,
                    p.custom_id AS product_code,
                    p.name AS product_name,
                    l.id AS lot_id,
                    l.lot_number,
                    l.expiration_date,
                    l.initial_quantity,
                    CASE
                        WHEN EXISTS (
                            SELECT 1
                            FROM farmacia_movimentoestoque im0
                            WHERE im0.lot_id = l.id
                              AND im0.deleted = %s
                              AND im0.type = 'ENT'
                              AND im0.origin = 'AJUS'
                              AND im0.quantity = l.initial_quantity
                              AND im0.created_at <= %s
                        )
                        THEN COALESCE((
                            SELECT SUM(CASE WHEN im.type = 'SAI' THEN -im.quantity ELSE im.quantity END)
                            FROM farmacia_movimentoestoque im
                            WHERE im.lot_id = l.id
                              AND im.deleted = %s
                              AND im.created_at <= %s
                        ), 0)
                        ELSE l.initial_quantity + COALESCE((
                            SELECT SUM(CASE WHEN im.type = 'SAI' THEN -im.quantity ELSE im.quantity END)
                            FROM farmacia_movimentoestoque im
                            WHERE im.lot_id = l.id
                              AND im.deleted = %s
                              AND im.created_at <= %s
                        ), 0)
                    END AS balance_as_of
                FROM matched_products p
                JOIN farmacia_lote l ON l.product_id = p.id
                WHERE l.tenant_id = %s
                  AND l.deleted = %s
                  AND l.created_at <= %s
            )
            SELECT
                product_id,
                product_code,
                product_name,
                SUM(balance_as_of) AS stock_as_of,
                COUNT(*) AS lot_count,
                SUM(CASE WHEN expiration_date < %s THEN balance_as_of ELSE 0 END) AS expired_stock_as_of
            FROM lot_balances
            GROUP BY product_id, product_code, product_name
            ORDER BY product_name ASC
            """,
            [
                context.tenant.id,
                False,
                product_like,
                product_like,
                product_query,
                product_like,
                False,
                as_of_dt,
                False,
                as_of_dt,
                False,
                as_of_dt,
                context.tenant.id,
                False,
                as_of_dt,
                as_of_date,
            ],
        )
        lot_rows = self._fetchall(
            """
            WITH matched_products AS (
                SELECT id, custom_id, name
                FROM farmacia_produto
                WHERE tenant_id = %s
                  AND deleted = %s
                  AND (LOWER(name) LIKE LOWER(%s) OR LOWER(COALESCE(custom_id, '')) LIKE LOWER(%s))
                ORDER BY name ASC
                LIMIT 8
            )
            SELECT
                p.custom_id AS product_code,
                p.name AS product_name,
                l.lot_number,
                l.expiration_date,
                CASE
                    WHEN EXISTS (
                        SELECT 1 FROM farmacia_movimentoestoque im0
                        WHERE im0.lot_id = l.id
                          AND im0.deleted = %s
                          AND im0.type = 'ENT'
                          AND im0.origin = 'AJUS'
                          AND im0.quantity = l.initial_quantity
                          AND im0.created_at <= %s
                    )
                    THEN COALESCE((
                        SELECT SUM(CASE WHEN im.type = 'SAI' THEN -im.quantity ELSE im.quantity END)
                        FROM farmacia_movimentoestoque im
                        WHERE im.lot_id = l.id
                          AND im.deleted = %s
                          AND im.created_at <= %s
                    ), 0)
                    ELSE l.initial_quantity + COALESCE((
                        SELECT SUM(CASE WHEN im.type = 'SAI' THEN -im.quantity ELSE im.quantity END)
                        FROM farmacia_movimentoestoque im
                        WHERE im.lot_id = l.id
                          AND im.deleted = %s
                          AND im.created_at <= %s
                    ), 0)
                END AS balance_as_of
            FROM matched_products p
            JOIN farmacia_lote l ON l.product_id = p.id
            WHERE l.tenant_id = %s
              AND l.deleted = %s
              AND l.created_at <= %s
            ORDER BY p.name ASC, l.expiration_date ASC, l.lot_number ASC
            LIMIT 12
            """,
            [
                context.tenant.id,
                False,
                product_like,
                product_like,
                False,
                as_of_dt,
                False,
                as_of_dt,
                False,
                as_of_dt,
                context.tenant.id,
                False,
                as_of_dt,
            ],
        )

        total_stock = sum(int(row.get("stock_as_of") or 0) for row in rows)
        return {
            "summary": {
                "title_pt": "Pesquisa SQL de stock histórico",
                "title_en": "SQL historical stock analytics",
                "metrics": [
                    {"label_pt": "Produtos encontrados", "label_en": "Matched products", "value": len(rows)},
                    {"label_pt": f"Stock em {as_of_date.isoformat()}", "label_en": f"Stock on {as_of_date.isoformat()}", "value": total_stock},
                    {"label_pt": "Lotes considerados", "label_en": "Lots considered", "value": sum(int(row.get("lot_count") or 0) for row in rows)},
                    {"label_pt": "Stock vencido na data", "label_en": "Expired stock on date", "value": sum(int(row.get("expired_stock_as_of") or 0) for row in rows)},
                ],
                "query_kind": "pharmacy_stock_as_of",
                "as_of_date": as_of_date.isoformat(),
                "product_query": product_query,
                "product_rows": rows,
                "lot_rows": lot_rows,
                "sql_templates": ["pharmacy_stock_as_of_products", "pharmacy_stock_as_of_lots"],
            },
            "analytics": {
                "query_kind": "pharmacy_stock_as_of",
                "as_of_date": as_of_date.isoformat(),
                "product_query": product_query,
                "product_rows": rows,
                "lot_rows": lot_rows,
            },
            "sources": [
                {"type": "sql_template", "label": "pharmacy_stock_as_of", "href": ""},
                {"type": "model", "label": "Product", "href": "/pharmacy"},
                {"type": "model", "label": "Lot", "href": "/pharmacy"},
                {"type": "model", "label": "InventoryMovement", "href": "/pharmacy/movements"},
                {"type": "policy", "label": "RBAC", "href": ""},
            ],
        }

    def _generic_resource_query(self, *, context: AiToolContext, parsed: ParsedAnalyticQuery, message: str) -> dict[str, Any]:
        descriptor = descriptor_by_basename(parsed.resource_basename)
        if descriptor is None:
            return self._no_match(language=context.language)
        if not user_can_read_resource(user=context.user, basename=descriptor.basename):
            return self._access_denied(
                language=context.language,
                resources=[(descriptor.basename, descriptor.label_pt, descriptor.label_en)],
            )

        model = django_apps.get_model(descriptor.app_label, descriptor.model_name)
        normalized = normalize_text(message)
        table_sql = _quote_name(model._meta.db_table)
        where_sql, params = _base_scope_where(model=model, tenant=context.tenant)
        effective_start = parsed.start_date
        effective_end = parsed.end_date or parsed.start_date
        date_field = _select_date_field(model=model, normalized=normalized)
        date_filter_applied = False
        if effective_start and effective_end and date_field is not None:
            if effective_start > effective_end:
                effective_start, effective_end = effective_end, effective_start
            start_value, end_value = _bounds_for_field(field=date_field, start=effective_start, end=effective_end)
            where_sql.append(f"{_quote_name(date_field.column)} BETWEEN %s AND %s")
            params.extend([start_value, end_value])
            date_filter_applied = True

        search_query = (parsed.search_query or "").strip()
        search_fields = _searchable_fields(model)
        if search_query and search_fields:
            search_clauses = [f"LOWER(COALESCE({_quote_name(field.column)}, '')) LIKE LOWER(%s)" for field in search_fields]
            where_sql.append("(" + " OR ".join(search_clauses) + ")")
            params.extend([f"%{search_query}%"] * len(search_fields))

        where_clause = f"WHERE {' AND '.join(where_sql)}" if where_sql else ""
        total_rows = self._fetchall(
            f"SELECT COUNT(*) AS total_count FROM {table_sql} {where_clause}",
            list(params),
        )
        total_count = int((total_rows[0] if total_rows else {}).get("total_count") or 0)

        group_results = []
        for field in _select_group_fields(model)[:3]:
            column_sql = _quote_name(field.column)
            rows = self._fetchall(
                (
                    f"SELECT {column_sql} AS value, COUNT(*) AS count "
                    f"FROM {table_sql} {where_clause} "
                    f"GROUP BY {column_sql} ORDER BY count DESC, value ASC LIMIT 8"
                ),
                list(params),
            )
            if rows:
                group_results.append(
                    {
                        "field": field.name,
                        "label": str(getattr(field, "verbose_name", field.name) or field.name),
                        "rows": [_serialize_row(row) for row in rows],
                    }
                )

        daily_rows: list[dict[str, Any]] = []
        if date_field is not None:
            date_column_sql = _quote_name(date_field.column)
            daily_rows = self._fetchall(
                (
                    f"SELECT DATE({date_column_sql}) AS day, COUNT(*) AS count "
                    f"FROM {table_sql} {where_clause} "
                    f"GROUP BY DATE({date_column_sql}) ORDER BY day ASC LIMIT 60"
                ),
                list(params),
            )
            daily_rows = [_serialize_row(row) for row in daily_rows]

        sample_fields = _select_sample_fields(model)
        sample_select = ", ".join(f"{_quote_name(field.column)} AS {_quote_name(field.name)}" for field in sample_fields)
        order_fields = [field for field in (date_field, _field_by_name(model, "id")) if field is not None]
        order_sql = ", ".join(f"{_quote_name(field.column)} DESC" for field in order_fields) or "1"
        sample_rows = self._fetchall(
            f"SELECT {sample_select} FROM {table_sql} {where_clause} ORDER BY {order_sql} LIMIT 5",
            list(params),
        )
        safe_sample_rows = [_serialize_row(row) for row in sample_rows]

        date_range = (
            {"start_date": effective_start.isoformat(), "end_date": effective_end.isoformat()}
            if effective_start and effective_end
            else None
        )
        metrics = [
            {"label_pt": "Registos encontrados", "label_en": "Matched records", "value": total_count},
            {"label_pt": "Agrupamentos calculados", "label_en": "Calculated groupings", "value": len(group_results)},
            {"label_pt": "Amostras seguras", "label_en": "Safe samples", "value": len(safe_sample_rows)},
        ]
        if date_range:
            metrics.append(
                {
                    "label_pt": "Filtro temporal aplicado" if date_filter_applied else "Filtro temporal indisponível",
                    "label_en": "Date filter applied" if date_filter_applied else "Date filter unavailable",
                    "value": date_field.name if date_filter_applied and date_field is not None else "—",
                }
            )
        if search_query:
            metrics.append({"label_pt": "Texto pesquisado", "label_en": "Searched text", "value": search_query})

        resource_payload = {
            "basename": descriptor.basename,
            "label_pt": descriptor.label_pt,
            "label_en": descriptor.label_en,
            "module": descriptor.prefix,
            "model": descriptor.model_label,
            "table": model._meta.db_table,
        }
        analytics_payload = {
            "query_kind": "generic_resource_query",
            "resource": resource_payload,
            "range": date_range,
            "date_field": date_field.name if date_field is not None else "",
            "date_filter_applied": date_filter_applied,
            "search_query": search_query,
            "total_count": total_count,
            "groups": group_results,
            "daily_rows": daily_rows,
            "sample_rows": safe_sample_rows,
            "sql_templates": ["generic_resource_total", "generic_resource_groups", "generic_resource_daily", "generic_resource_sample"],
        }

        return {
            "summary": {
                "title_pt": f"Pesquisa SQL de {descriptor.label_pt}",
                "title_en": f"SQL analytics for {descriptor.label_en}",
                "metrics": metrics,
                "query_kind": "generic_resource_query",
                "resource": resource_payload,
                "range": date_range,
                "date_field": analytics_payload["date_field"],
                "date_filter_applied": date_filter_applied,
                "search_query": search_query,
                "groups": group_results,
                "daily_rows": daily_rows,
                "sample_rows": safe_sample_rows,
            },
            "analytics": analytics_payload,
            "sources": [
                {"type": "sql_template", "label": "generic_resource_analytics", "href": ""},
                {"type": "model", "label": descriptor.model_label, "href": descriptor.href},
                {"type": "policy", "label": "RBAC", "href": ""},
            ],
        }

    def _fetchall(self, sql: str, params: list[Any]) -> list[dict[str, Any]]:
        with connection.cursor() as cursor:
            cursor.execute(sql, params)
            columns = [column[0] for column in cursor.description]
            return [dict(zip(columns, row)) for row in cursor.fetchall()]

    def _extract_dates(self, message: str) -> list[date]:
        values: list[date] = []
        for raw in re.findall(DATE_PATTERN, message or "", flags=re.IGNORECASE):
            parsed = _parse_date(raw)
            if parsed and parsed not in values:
                values.append(parsed)
        return values[:2]

    def _extract_product_query(self, message: str) -> str:
        specific = re.search(
            rf"\b(?:medicacao|medicação|medicamento|produto|farmaco|fármaco)\s+(?P<product>.+?)(?=\s+(?:no dia|na data|em)\s+{DATE_PATTERN}|$)",
            message or "",
            flags=re.IGNORECASE,
        )
        if specific:
            value = re.sub(DATE_PATTERN, " ", specific.group("product"), flags=re.IGNORECASE)
            value = re.sub(r"\s+", " ", value).strip(" ?!.;:,")
            if value:
                return value

        cleaned = re.sub(DATE_PATTERN, " ", message or "", flags=re.IGNORECASE)
        cleaned = re.sub(
            r"\b(?:diga-me|diga me|me|no dia|na data|em|era|qual|quanto|quantos|tinha|havia|stock|estoque|saldo|de|do|da|o|a|os|as)\b",
            " ",
            cleaned,
            flags=re.IGNORECASE,
        )
        cleaned = re.sub(r"\b(?:medicacao|medicação|medicamento|produto|farmaco|fármaco|farmacia|farmácia)\b", " ", cleaned, flags=re.IGNORECASE)
        return re.sub(r"\s+", " ", cleaned).strip(" ?!.;:,")

    def _extract_generic_search_query(self, *, message: str, descriptor: ResourceDescriptor) -> str:
        quoted = re.search(r"[\"'“”](?P<value>[^\"'“”]{2,120})[\"'“”]", message or "")
        if quoted:
            return re.sub(r"\s+", " ", quoted.group("value")).strip(" ?!.;:,")

        explicit = re.search(
            r"\b(?:nome|name|codigo|código|code|referencia|referência|reference|numero|número|number|chamado|called)\s+(?P<value>[^?!.;]{2,120})",
            message or "",
            flags=re.IGNORECASE,
        )
        if explicit:
            value = re.sub(DATE_PATTERN, " ", explicit.group("value"), flags=re.IGNORECASE)
            value = _strip_resource_terms(value=value, descriptor=descriptor)
            return value

        normalized_intent = normalize_text(message)
        if not any(term in normalized_intent for term in ("listar", "lista", "mostre", "mostrar", "buscar", "pesquisar", "procure", "search", "list")):
            return ""

        cleaned = re.sub(DATE_PATTERN, " ", message or "", flags=re.IGNORECASE)
        cleaned = _strip_resource_terms(value=cleaned, descriptor=descriptor)
        return cleaned

    def _access_denied(self, *, language: str, resources: list[tuple[str, str, str]]) -> dict[str, Any]:
        denied_payload = [
            {
                "basename": basename,
                "label_pt": label_pt,
                "label_en": label_en,
                "href": "",
            }
            for basename, label_pt, label_en in resources
        ]
        return {
            "summary": {
                "title_pt": "Pesquisa SQL bloqueada por permissões",
                "title_en": "SQL analytics blocked by permissions",
                "metrics": [
                    {"label_pt": "Acesso", "label_en": "Access", "value": "negado"},
                    {"label_pt": "Recursos bloqueados", "label_en": "Blocked resources", "value": len(resources)},
                ],
                "denied_resources": denied_payload,
            },
            "access_denied": True,
            "denied_resources": denied_payload,
            "sources": [{"type": "policy", "label": "RBAC", "href": ""}],
        }

    def _needs_more(self, *, language: str, prompt_pt: str, prompt_en: str) -> dict[str, Any]:
        return {
            "summary": {
                "title_pt": "Pesquisa SQL precisa de mais dados",
                "title_en": "SQL analytics needs more data",
                "metrics": [],
                "prompt_pt": prompt_pt,
                "prompt_en": prompt_en,
            },
            "analytics": {"status": "needs_more", "prompt_pt": prompt_pt, "prompt_en": prompt_en},
            "access_denied": False,
            "sources": [{"type": "policy", "label": "SQL templates", "href": ""}],
        }

    def _no_match(self, *, language: str) -> dict[str, Any]:
        return {
            "summary": {
                "title_pt": "Pesquisa SQL não aplicada",
                "title_en": "SQL analytics not applied",
                "metrics": [],
            },
            "analytics": {"status": "no_match"},
            "access_denied": False,
            "sources": [],
        }


def should_select_sql_analytics(message: str, active_module: str = "") -> bool:
    normalized = normalize_text(f"{message or ''} {active_module or ''}")
    has_date = bool(re.search(DATE_PATTERN, message or "", flags=re.IGNORECASE))
    patient_entry = "paciente" in normalized and any(
        term in normalized for term in ("entrada", "entraram", "deram entrada", "checkin", "check in", "check-in", "admitidos")
    )
    stock_history = any(term in normalized for term in ("estoque", "stock", "saldo")) and any(
        term in normalized for term in ("medicacao", "medicação", "medicamento", "produto", "farmaco", "fármaco", "farmacia", "farmácia")
    )
    if has_date and (patient_entry or stock_history):
        return True
    if _has_crud_intent(normalized):
        return False
    descriptor = _best_specific_descriptor(message)
    return bool(descriptor and _has_generic_analytic_intent(normalized=normalized, dates=[] if not has_date else [timezone.localdate()]))


def _has_generic_analytic_intent(*, normalized: str, dates: list[date]) -> bool:
    if dates:
        return True
    terms = (
        "quantos",
        "quantas",
        "quanto",
        "total",
        "contar",
        "count",
        "existem",
        "existe",
        "listar",
        "lista",
        "mostre",
        "mostrar",
        "ver",
        "consultar",
        "procure",
        "buscar",
        "pesquisar",
        "registos",
        "registros",
        "criados",
        "criadas",
        "criado",
        "criada",
        "actualizados",
        "atualizados",
        "actualizadas",
        "atualizadas",
        "entre",
        "a partir",
        "desde",
        "por estado",
        "por tipo",
        "por prioridade",
        "records",
        "list",
        "search",
    )
    return any(term in normalized for term in terms)


def _has_crud_intent(normalized: str) -> bool:
    terms = (
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
        "apagar",
        "apague",
        "remover",
        "remova",
        "eliminar",
        "elimine",
        "excluir",
        "exclua",
        "create",
        "insert",
        "update",
        "delete",
        "remove",
    )
    return any(term in normalized for term in terms)


def _best_specific_descriptor(message: str) -> ResourceDescriptor | None:
    normalized = normalize_text(message)
    for descriptor in match_resource_descriptors(message, limit=6):
        if _descriptor_has_specific_match(descriptor=descriptor, normalized=normalized):
            return descriptor
    return None


def _descriptor_has_specific_match(*, descriptor: ResourceDescriptor, normalized: str) -> bool:
    terms = {
        descriptor.route_name,
        descriptor.route_name.replace("_", " "),
        descriptor.basename,
        descriptor.basename.replace("-", " "),
        descriptor.model_name,
        descriptor.model_label,
        descriptor.label_pt,
        descriptor.label_en,
        *RESOURCE_ALIASES.get(descriptor.basename, ()),
    }
    for raw_term in terms:
        term = normalize_text(raw_term)
        if not term:
            continue
        if re.search(rf"(?<!\w){re.escape(term)}(?!\w)", normalized):
            return True
    return False


def _quote_name(value: str) -> str:
    return connection.ops.quote_name(value)


def _field_by_name(model: type[models.Model], name: str) -> models.Field | None:
    try:
        return model._meta.get_field(name)
    except Exception:
        return None


def _base_scope_where(*, model: type[models.Model], tenant) -> tuple[list[str], list[Any]]:
    clauses: list[str] = []
    params: list[Any] = []
    tenant_field = _field_by_name(model, "tenant")
    if tenant is not None and tenant_field is not None:
        clauses.append(f"{_quote_name(tenant_field.column)} = %s")
        params.append(tenant.id)
    deleted_field = _field_by_name(model, "deleted")
    if deleted_field is not None:
        clauses.append(f"{_quote_name(deleted_field.column)} = %s")
        params.append(False)
    return clauses, params


def _select_date_field(*, model: type[models.Model], normalized: str) -> models.Field | None:
    intent_priorities: list[str] = []
    if any(term in normalized for term in ("criado", "criada", "criados", "criadas", "created")):
        intent_priorities.append("created_at")
    if any(term in normalized for term in ("actualizado", "atualizado", "actualizada", "atualizada", "updated")):
        intent_priorities.append("updated_at")
    if any(term in normalized for term in ("pago", "pagamento", "paid")):
        intent_priorities.append("paid_at")
    if any(term in normalized for term in ("emitido", "emitida", "fatura", "factura", "invoice", "issued")):
        intent_priorities.append("issued_at")
    if any(term in normalized for term in ("agendado", "agendada", "marcado", "marcada", "scheduled")):
        intent_priorities.extend(["scheduled_at", "scheduled_for", "scheduled_date"])
    if any(term in normalized for term in ("matricula", "matrícula", "matriculado", "matriculada", "enrolled")):
        intent_priorities.append("enrolled_on")
    if any(term in normalized for term in ("presenca", "presença", "attendance")):
        intent_priorities.append("attendance_date")
    if any(term in normalized for term in ("entrada", "entraram", "checkin", "check-in", "check in", "admissao", "admissão")):
        intent_priorities.append("arrived_at")

    fallback_priorities = [
        "arrived_at",
        "created_at",
        "paid_at",
        "issued_at",
        "performed_at",
        "performed_date",
        "scheduled_at",
        "scheduled_for",
        "scheduled_date",
        "attendance_date",
        "enrolled_on",
        "date",
        "updated_at",
    ]
    for field_name in [*intent_priorities, *fallback_priorities]:
        field = _field_by_name(model, field_name)
        if field is not None and isinstance(field, (models.DateTimeField, models.DateField)):
            return field
    return None


def _bounds_for_field(*, field: models.Field, start: date, end: date) -> tuple[Any, Any]:
    if isinstance(field, models.DateTimeField):
        return _start_of_day(start), _end_of_day(end)
    return start, end


def _searchable_fields(model: type[models.Model]) -> list[models.Field]:
    blocked_parts = ("password", "token", "secret", "hash", "salt", "key", "credential")
    fields: list[models.Field] = []
    for field in model._meta.concrete_fields:
        name = field.name.lower()
        column = field.column.lower()
        if any(part in name or part in column for part in blocked_parts):
            continue
        if isinstance(field, (models.CharField, models.TextField, models.EmailField, models.URLField, models.SlugField)):
            fields.append(field)
    return fields[:10]


def _select_group_fields(model: type[models.Model]) -> list[models.Field]:
    priorities = (
        "status",
        "state",
        "workflow_status",
        "billing_status",
        "clinical_status",
        "type",
        "content_type",
        "origin",
        "priority",
        "method",
        "active",
        "published",
    )
    selected: list[models.Field] = []
    for field_name in priorities:
        field = _field_by_name(model, field_name)
        if field is None:
            continue
        if isinstance(field, (models.CharField, models.BooleanField, models.IntegerField)):
            selected.append(field)
    return selected


def _select_sample_fields(model: type[models.Model]) -> list[models.Field]:
    blocked = {"tenant", "deleted", "deleted_at", "deleted_by", "password", "token", "secret", "hash", "salt", "key"}
    priorities = (
        "id",
        "custom_id",
        "student_code",
        "teacher_code",
        "code",
        "number",
        "external_reference",
        "serial_number",
        "name",
        "title",
        "status",
        "state",
        "type",
        "origin",
        "priority",
        "method",
        "active",
        "created_at",
        "updated_at",
        "date",
        "arrived_at",
        "scheduled_at",
        "scheduled_for",
        "enrolled_on",
        "attendance_date",
        "paid_at",
        "issued_at",
    )
    selected: list[models.Field] = []
    for field_name in priorities:
        if field_name in blocked:
            continue
        field = _field_by_name(model, field_name)
        if field is None or getattr(field, "many_to_many", False):
            continue
        if field not in selected:
            selected.append(field)
    if not selected:
        pk = model._meta.pk
        selected.append(pk)
    return selected[:8]


def _serialize_row(row: dict[str, Any]) -> dict[str, Any]:
    return {key: _serialize_value(value) for key, value in row.items()}


def _serialize_value(value: Any) -> Any:
    if hasattr(value, "isoformat"):
        return value.isoformat()
    return value


def _strip_resource_terms(*, value: str, descriptor: ResourceDescriptor) -> str:
    cleaned = value or ""
    terms = sorted(
        {
            descriptor.route_name,
            descriptor.route_name.replace("_", " "),
            descriptor.basename,
            descriptor.basename.replace("-", " "),
            descriptor.label_pt,
            descriptor.label_en,
            *RESOURCE_ALIASES.get(descriptor.basename, ()),
        },
        key=len,
        reverse=True,
    )
    for raw_term in terms:
        term = raw_term.strip()
        if not term:
            continue
        cleaned = re.sub(rf"(?<!\w){re.escape(term)}(?!\w)", " ", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(
        r"\b(?:quantos|quantas|quanto|total|contar|existem|existe|listar|lista|mostre|mostrar|ver|consultar|procure|buscar|pesquisar|investigar|analisar|analise|dados|registos|registros|criados|criadas|criado|criada|foram|foi|de|do|da|dos|das|em|no|na|nos|nas|entre|a|ate|até|partir|desde|dia|por|estado|tipo|prioridade|count|records|list|search|with|named|called)\b",
        " ",
        cleaned,
        flags=re.IGNORECASE,
    )
    cleaned = re.sub(r"\s+", " ", cleaned).strip(" ?!.;:,")
    return cleaned if len(cleaned) >= 2 else ""


def _parse_date(raw: str) -> date | None:
    raw = (raw or "").strip()
    for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y", "%d/%m/%y", "%d-%m-%y"):
        try:
            return datetime.strptime(raw, fmt).date()
        except ValueError:
            continue
    return None


def _start_of_day(value: date | None):
    value = value or timezone.localdate()
    return timezone.make_aware(datetime.combine(value, time.min), timezone.get_current_timezone())


def _end_of_day(value: date | None):
    value = value or timezone.localdate()
    return timezone.make_aware(datetime.combine(value, time.max), timezone.get_current_timezone())


def _safe_recent_checkin(row: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": row.get("id"),
        "custom_id": row.get("custom_id") or "",
        "arrived_at": row.get("arrived_at").isoformat() if hasattr(row.get("arrived_at"), "isoformat") else row.get("arrived_at"),
        "status": row.get("status") or "",
        "priority": row.get("priority") or "",
        "patient_code": row.get("patient_code") or "",
        "patient_name": row.get("patient_name") or "",
    }
