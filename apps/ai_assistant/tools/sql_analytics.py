from __future__ import annotations

import re
from dataclasses import dataclass
from datetime import date, datetime, time, timedelta
from decimal import Decimal
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
        historical_terms = any(
            term in normalized
            for term in (
                "no dia",
                "na data",
                "em ",
                "era",
                "tinha",
                "havia",
                "historico",
                "histórico",
                "hoje",
                "ontem",
                "anteontem",
                "este mes",
                "mes passado",
                "ultimos",
                "últimos",
                "last",
                "today",
                "yesterday",
            )
        )
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
        base_where_sql, base_params = _base_scope_where(model=model, tenant=context.tenant)
        where_sql = list(base_where_sql)
        params = list(base_params)
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
        search_clause = ""
        search_params: list[Any] = []
        if search_query and search_fields:
            search_clauses = [f"LOWER(COALESCE({_quote_name(field.column)}, '')) LIKE LOWER(%s)" for field in search_fields]
            search_clause = "(" + " OR ".join(search_clauses) + ")"
            search_params = [f"%{search_query}%"] * len(search_fields)
            where_sql.append(search_clause)
            params.extend(search_params)

        where_clause = f"WHERE {' AND '.join(where_sql)}" if where_sql else ""
        total_rows = self._fetchall(
            f"SELECT COUNT(*) AS total_count FROM {table_sql} {where_clause}",
            list(params),
        )
        total_count = int((total_rows[0] if total_rows else {}).get("total_count") or 0)

        group_results = []
        for field in _select_group_fields(model, normalized=normalized)[:4]:
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

        period_rows: list[dict[str, Any]] = []
        bucket = _select_date_bucket(normalized=normalized, start=effective_start, end=effective_end)
        if date_field is not None:
            date_column_sql = _quote_name(date_field.column)
            bucket_sql = _date_bucket_sql(date_column_sql=date_column_sql, bucket=bucket)
            period_rows = self._fetchall(
                (
                    f"SELECT {bucket_sql} AS period, COUNT(*) AS count "
                    f"FROM {table_sql} {where_clause} "
                    f"GROUP BY {bucket_sql} ORDER BY period ASC LIMIT 90"
                ),
                list(params),
            )
            period_rows = [_serialize_row(row) for row in period_rows]

        numeric_summaries = []
        for field in _select_numeric_fields(model=model, normalized=normalized)[:5]:
            column_sql = _quote_name(field.column)
            rows = self._fetchall(
                (
                    f"SELECT "
                    f"COALESCE(SUM({column_sql}), 0) AS total, "
                    f"AVG({column_sql}) AS average, "
                    f"MIN({column_sql}) AS minimum, "
                    f"MAX({column_sql}) AS maximum "
                    f"FROM {table_sql} {where_clause}"
                ),
                list(params),
            )
            row = rows[0] if rows else {}
            numeric_summaries.append(
                {
                    "field": field.name,
                    "label": str(getattr(field, "verbose_name", field.name) or field.name),
                    "total": _serialize_value(row.get("total")),
                    "average": _serialize_value(row.get("average")),
                    "minimum": _serialize_value(row.get("minimum")),
                    "maximum": _serialize_value(row.get("maximum")),
                }
            )

        comparison = None
        if date_filter_applied and effective_start and effective_end and date_field is not None:
            previous_start, previous_end = _previous_period(start=effective_start, end=effective_end)
            prev_start_value, prev_end_value = _bounds_for_field(field=date_field, start=previous_start, end=previous_end)
            previous_where = [*base_where_sql, f"{_quote_name(date_field.column)} BETWEEN %s AND %s"]
            previous_params = [*base_params, prev_start_value, prev_end_value]
            if search_clause:
                previous_where.append(search_clause)
                previous_params.extend(search_params)
            previous_clause = f"WHERE {' AND '.join(previous_where)}" if previous_where else ""
            previous_rows = self._fetchall(
                f"SELECT COUNT(*) AS total_count FROM {table_sql} {previous_clause}",
                previous_params,
            )
            previous_count = int((previous_rows[0] if previous_rows else {}).get("total_count") or 0)
            comparison = {
                "previous_start_date": previous_start.isoformat(),
                "previous_end_date": previous_end.isoformat(),
                "previous_count": previous_count,
                "current_count": total_count,
                "absolute_delta": total_count - previous_count,
                "percent_delta": _percent_delta(current=total_count, previous=previous_count),
            }

        sample_fields = _select_sample_fields(model)
        sample_select = ", ".join(f"{_quote_name(field.column)} AS {_quote_name(field.name)}" for field in sample_fields)
        order_fields = [field for field in (date_field, _field_by_name(model, "id")) if field is not None]
        order_sql = ", ".join(f"{_quote_name(field.column)} DESC" for field in order_fields) or "1"
        sample_rows = self._fetchall(
            f"SELECT {sample_select} FROM {table_sql} {where_clause} ORDER BY {order_sql} LIMIT 5",
            list(params),
        )
        safe_sample_rows = [_serialize_row(row) for row in sample_rows]
        insights = _build_generic_insights(
            descriptor=descriptor,
            total_count=total_count,
            groups=group_results,
            period_rows=period_rows,
            numeric_summaries=numeric_summaries,
            comparison=comparison,
        )
        next_questions = _build_generic_next_questions(
            descriptor=descriptor,
            has_date_range=bool(effective_start and effective_end),
            has_search_query=bool(search_query),
            groups=group_results,
            numeric_summaries=numeric_summaries,
        )

        date_range = (
            {"start_date": effective_start.isoformat(), "end_date": effective_end.isoformat()}
            if effective_start and effective_end
            else None
        )
        metrics = [
            {"label_pt": "Registos encontrados", "label_en": "Matched records", "value": total_count},
            {"label_pt": "Agrupamentos calculados", "label_en": "Calculated groupings", "value": len(group_results)},
            {"label_pt": "Indicadores numéricos", "label_en": "Numeric indicators", "value": len(numeric_summaries)},
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
        if comparison:
            metrics.append({"label_pt": "Variação vs período anterior", "label_en": "Change vs previous period", "value": comparison["absolute_delta"]})
        if numeric_summaries:
            first_numeric = numeric_summaries[0]
            metrics.append(
                {
                    "label_pt": f"Total de {first_numeric['label']}",
                    "label_en": f"Total {first_numeric['label']}",
                    "value": first_numeric.get("total"),
                }
            )

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
            "daily_rows": period_rows,
            "period_rows": period_rows,
            "period_bucket": bucket,
            "numeric_summaries": numeric_summaries,
            "comparison": comparison,
            "sample_rows": safe_sample_rows,
            "insights": insights,
            "next_questions": next_questions,
            "sql_templates": [
                "generic_resource_total",
                "generic_resource_groups",
                "generic_resource_periods",
                "generic_resource_numeric",
                "generic_resource_comparison",
                "generic_resource_sample",
            ],
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
                "daily_rows": period_rows,
                "period_rows": period_rows,
                "period_bucket": bucket,
                "numeric_summaries": numeric_summaries,
                "comparison": comparison,
                "sample_rows": safe_sample_rows,
                "insights": insights,
                "next_questions": next_questions,
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
        for parsed in _extract_natural_dates(message):
            if parsed and parsed not in values:
                values.append(parsed)
        return values[:2]

    def _extract_product_query(self, message: str) -> str:
        specific = re.search(
            rf"\b(?:medicacao|medicação|medicamento|produto|farmaco|fármaco)\s+(?P<product>.+?)(?=\s+(?:no dia|na data|em)\s+{DATE_PATTERN}|\s+(?:hoje|ontem|anteontem|yesterday|today|este mês|este mes|this month|mês passado|mes passado|last month|últimos|ultimos|last)\b|$)",
            message or "",
            flags=re.IGNORECASE,
        )
        if specific:
            value = _remove_date_expressions(specific.group("product"))
            value = re.sub(r"\s+", " ", value).strip(" ?!.;:,")
            if value:
                return value

        cleaned = _remove_date_expressions(message or "")
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
            value = _remove_date_expressions(explicit.group("value"))
            value = _strip_resource_terms(value=value, descriptor=descriptor)
            return value

        normalized_intent = normalize_text(message)
        if not any(term in normalized_intent for term in ("listar", "lista", "mostre", "mostrar", "buscar", "pesquisar", "procure", "search", "list")):
            return ""

        cleaned = _remove_date_expressions(message or "")
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
    has_date = _has_date_signal(message)
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


def _has_date_signal(message: str) -> bool:
    if re.search(DATE_PATTERN, message or "", flags=re.IGNORECASE):
        return True
    return bool(_extract_natural_dates(message))


def _extract_natural_dates(message: str) -> list[date]:
    normalized = normalize_text(message or "")
    today = timezone.localdate()

    rolling_hours = re.search(r"\b(?:ultimas|últimas|last)\s+(?P<hours>\d{1,3})\s+(?:horas|hours|h)\b", message or "", flags=re.IGNORECASE)
    if rolling_hours:
        hours = max(1, min(int(rolling_hours.group("hours")), 24 * 31))
        days = max(1, (hours + 23) // 24)
        return [today - timedelta(days=days - 1), today]

    rolling_weeks = re.search(r"\b(?:ultimas|últimas|ultimos|últimos|last)\s+(?P<weeks>\d{1,2})\s+(?:semanas|weeks|w)\b", message or "", flags=re.IGNORECASE)
    if rolling_weeks:
        weeks = max(1, min(int(rolling_weeks.group("weeks")), 52))
        return [today - timedelta(days=(weeks * 7) - 1), today]

    rolling_months = re.search(r"\b(?:ultimos|últimos|ultimas|últimas|last)\s+(?P<months>\d{1,2})\s+(?:meses|months|m)\b", message or "", flags=re.IGNORECASE)
    if rolling_months:
        months = max(1, min(int(rolling_months.group("months")), 36))
        return [_add_months(today.replace(day=1), -(months - 1)), today]

    rolling_years = re.search(r"\b(?:ultimos|últimos|ultimas|últimas|last)\s+(?P<years>\d{1,2})\s+(?:anos|years|y)\b", message or "", flags=re.IGNORECASE)
    if rolling_years:
        years = max(1, min(int(rolling_years.group("years")), 10))
        return [date(today.year - years + 1, 1, 1), today]

    rolling = re.search(r"\b(?:ultimos|ultimas|últimos|últimas|last)\s+(?P<days>\d{1,3})\s+(?:dias|days|d)\b", message or "", flags=re.IGNORECASE)
    if rolling:
        days = max(1, min(int(rolling.group("days")), 365))
        return [today - timedelta(days=days - 1), today]

    if any(term in normalized for term in ("este ano", "ano corrente", "this year", "current year")):
        return [date(today.year, 1, 1), today]

    if any(term in normalized for term in ("ano passado", "last year")):
        return [date(today.year - 1, 1, 1), date(today.year - 1, 12, 31)]

    if any(term in normalized for term in ("este trimestre", "trimestre corrente", "this quarter")):
        quarter_start_month = ((today.month - 1) // 3) * 3 + 1
        return [date(today.year, quarter_start_month, 1), today]

    if any(term in normalized for term in ("trimestre passado", "last quarter")):
        quarter_start_month = ((today.month - 1) // 3) * 3 + 1
        current_quarter_start = date(today.year, quarter_start_month, 1)
        previous_quarter_end = current_quarter_start - timedelta(days=1)
        previous_quarter_start_month = ((previous_quarter_end.month - 1) // 3) * 3 + 1
        return [date(previous_quarter_end.year, previous_quarter_start_month, 1), previous_quarter_end]

    if any(term in normalized for term in ("este semestre", "semestre corrente", "this semester", "this half")):
        semester_start_month = 1 if today.month <= 6 else 7
        return [date(today.year, semester_start_month, 1), today]

    if any(term in normalized for term in ("semestre passado", "last semester", "last half")):
        if today.month <= 6:
            return [date(today.year - 1, 7, 1), date(today.year - 1, 12, 31)]
        return [date(today.year, 1, 1), date(today.year, 6, 30)]

    if any(term in normalized for term in ("este mes", "this month", "mes corrente", "mês corrente")):
        return [today.replace(day=1), today]

    if any(term in normalized for term in ("mes passado", "mês passado", "last month")):
        first_this_month = today.replace(day=1)
        last_previous_month = first_this_month - timedelta(days=1)
        first_previous_month = last_previous_month.replace(day=1)
        return [first_previous_month, last_previous_month]

    if any(term in normalized for term in ("esta semana", "this week", "semana corrente")):
        return [today - timedelta(days=today.weekday()), today]

    if any(term in normalized for term in ("semana passada", "last week")):
        start_this_week = today - timedelta(days=today.weekday())
        end_previous_week = start_this_week - timedelta(days=1)
        start_previous_week = end_previous_week - timedelta(days=6)
        return [start_previous_week, end_previous_week]

    if any(term in normalized for term in ("anteontem", "antes de ontem")):
        value = today - timedelta(days=2)
        return [value, value]

    if any(term in normalized for term in ("ontem", "yesterday")):
        value = today - timedelta(days=1)
        return [value, value]

    if any(term in normalized for term in ("hoje", "today")):
        return [today, today]

    return []


def _remove_date_expressions(value: str) -> str:
    cleaned = re.sub(DATE_PATTERN, " ", value or "", flags=re.IGNORECASE)
    cleaned = re.sub(
        r"\b(?:hoje|ontem|anteontem|antes de ontem|today|yesterday|este mês|este mes|mês corrente|mes corrente|this month|mês passado|mes passado|last month|esta semana|semana corrente|this week|semana passada|last week|últimos|ultimos|últimas|ultimas|last|dias|days|dia|day)\b",
        " ",
        cleaned,
        flags=re.IGNORECASE,
    )
    cleaned = re.sub(r"\b\d{1,3}\s*(?:dias|days|d)\b", " ", cleaned, flags=re.IGNORECASE)
    return re.sub(r"\s+", " ", cleaned).strip()


def _add_months(value: date, months: int) -> date:
    month_index = (value.year * 12 + value.month - 1) + months
    year = month_index // 12
    month = month_index % 12 + 1
    return date(year, month, 1)


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
    return _descriptor_from_business_terms(normalized)


def _descriptor_from_business_terms(normalized: str) -> ResourceDescriptor | None:
    mappings = (
        (("faturou", "facturou", "receita", "receitas", "valor faturado", "valor facturado", "cobranca", "cobrança"), "billing-invoice"),
        (("pagou", "pago", "pagamentos recebidos", "valor pago", "recebimentos"), "payments-payment"),
        (("vendas de farmacia", "vendas da farmacia", "venda de farmacia", "venda da farmacia"), "pharmacy-sale"),
        (("salario", "salário", "folha salarial", "folha de pagamento"), "human_resources-folhapagamento"),
        (("erros", "falhas", "5xx", "4xx", "excecoes", "exceções"), "monitoring-error"),
        (("checkins", "check-ins", "entradas de pacientes", "admissoes", "admissões"), "reception-checkin"),
    )
    for terms, basename in mappings:
        if any(term in normalized for term in terms):
            return descriptor_by_basename(basename)
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


def _select_group_fields(model: type[models.Model], normalized: str = "") -> list[models.Field]:
    requested: list[str] = []
    if any(term in normalized for term in ("por estado", "estado", "status")):
        requested.extend(["status", "state", "workflow_status", "billing_status", "clinical_status"])
    if any(term in normalized for term in ("por tipo", "tipo", "categoria")):
        requested.extend(["type", "content_type"])
    if any(term in normalized for term in ("por prioridade", "prioridade")):
        requested.append("priority")
    if any(term in normalized for term in ("por origem", "origem")):
        requested.append("origin")
    if any(term in normalized for term in ("por metodo", "por método", "metodo", "método")):
        requested.append("method")

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
    for field_name in [*requested, *priorities]:
        field = _field_by_name(model, field_name)
        if field is None:
            continue
        if isinstance(field, (models.CharField, models.BooleanField, models.IntegerField)):
            if field not in selected:
                selected.append(field)
    return selected


def _select_numeric_fields(*, model: type[models.Model], normalized: str) -> list[models.Field]:
    blocked_names = {"id", "tenant", "tenant_id", "version", "created_by", "updated_by", "deleted_by"}
    requested: list[str] = []
    if any(term in normalized for term in ("faturou", "facturou", "receita", "valor", "total", "cobranca", "cobrança")):
        requested.extend(["total", "value", "amount", "paid_amount", "subtotal", "unit_price", "sale_price", "price"])
    if any(term in normalized for term in ("quantidade", "volume", "stock", "estoque", "saldo", "lote")):
        requested.extend(["quantity", "initial_quantity", "minimum_volume_ml", "available_quantity"])
    if any(term in normalized for term in ("salario", "salário", "liquido", "líquido", "base")):
        requested.extend(["net_salary", "gross_salary", "base_salary", "salary_base", "salary_liquido"])
    if any(term in normalized for term in ("media", "média", "average", "minimo", "mínimo", "maximo", "máximo")):
        requested.extend(["total", "value", "score", "duration_ms", "quantity"])

    priority_names = [
        *requested,
        "total",
        "value",
        "amount",
        "paid_amount",
        "subtotal",
        "quantity",
        "initial_quantity",
        "unit_price",
        "sale_price",
        "price",
        "score",
        "max_score",
        "duration_ms",
        "minimum_volume_ml",
        "base_salary",
        "net_salary",
        "gross_salary",
    ]
    selected: list[models.Field] = []
    for field_name in priority_names:
        field = _field_by_name(model, field_name)
        if field and _is_safe_numeric_field(field=field, blocked_names=blocked_names) and field not in selected:
            selected.append(field)

    for field in model._meta.concrete_fields:
        if _is_safe_numeric_field(field=field, blocked_names=blocked_names) and field not in selected:
            selected.append(field)
    return selected


def _is_safe_numeric_field(*, field: models.Field, blocked_names: set[str]) -> bool:
    if field.name in blocked_names or getattr(field, "primary_key", False):
        return False
    if getattr(field, "is_relation", False) or field.name.endswith("_id") or field.column.endswith("_id"):
        return False
    if isinstance(field, (models.BooleanField, models.AutoField, models.BigAutoField)):
        return False
    return isinstance(
        field,
        (
            models.DecimalField,
            models.FloatField,
            models.IntegerField,
            models.PositiveIntegerField,
            models.PositiveSmallIntegerField,
            models.SmallIntegerField,
            models.BigIntegerField,
        ),
    )


def _select_date_bucket(*, normalized: str, start: date | None, end: date | None) -> str:
    if any(term in normalized for term in ("por ano", "ano a ano", "yearly", "por anos")):
        return "year"
    if any(term in normalized for term in ("por mes", "por mês", "mensal", "month", "monthly")):
        return "month"
    if any(term in normalized for term in ("por semana", "semanal", "week", "weekly")):
        return "week"
    if start and end and (end - start).days > 370:
        return "year"
    if start and end and (end - start).days > 75:
        return "month"
    if start and end and (end - start).days > 21:
        return "week"
    return "day"


def _date_bucket_sql(*, date_column_sql: str, bucket: str) -> str:
    vendor = connection.vendor
    if vendor == "postgresql":
        if bucket == "year":
            return f"TO_CHAR(DATE_TRUNC('year', {date_column_sql}), 'YYYY')"
        if bucket == "month":
            return f"TO_CHAR(DATE_TRUNC('month', {date_column_sql}), 'YYYY-MM')"
        if bucket == "week":
            return f"TO_CHAR(DATE_TRUNC('week', {date_column_sql}), 'YYYY-MM-DD')"
        return f"DATE({date_column_sql})"
    if bucket == "year":
        return f"strftime('%Y', {date_column_sql})"
    if bucket == "month":
        return f"strftime('%Y-%m', {date_column_sql})"
    if bucket == "week":
        return f"strftime('%Y-W%W', {date_column_sql})"
    return f"DATE({date_column_sql})"


def _previous_period(*, start: date, end: date) -> tuple[date, date]:
    span = max((end - start).days, 0)
    previous_end = start - timedelta(days=1)
    previous_start = previous_end - timedelta(days=span)
    return previous_start, previous_end


def _percent_delta(*, current: int, previous: int) -> float | None:
    if previous == 0:
        return None
    return round(((current - previous) / previous) * 100, 2)


def _build_generic_insights(
    *,
    descriptor: ResourceDescriptor,
    total_count: int,
    groups: list[dict[str, Any]],
    period_rows: list[dict[str, Any]],
    numeric_summaries: list[dict[str, Any]],
    comparison: dict[str, Any] | None,
) -> list[dict[str, str]]:
    insights: list[dict[str, str]] = []
    if total_count == 0:
        insights.append(
            {
                "label_pt": f"Não encontrei registos de {descriptor.label_pt.lower()} com estes filtros.",
                "label_en": f"I found no {descriptor.label_en.lower()} records with these filters.",
                "severity": "warning",
            }
        )
    elif total_count <= 5:
        insights.append(
            {
                "label_pt": f"Volume baixo: {total_count} registo(s), adequado para revisão manual imediata.",
                "label_en": f"Low volume: {total_count} record(s), suitable for immediate manual review.",
                "severity": "info",
            }
        )
    else:
        insights.append(
            {
                "label_pt": f"Volume relevante: {total_count} registo(s), vale a pena explorar por agrupamento e período.",
                "label_en": f"Relevant volume: {total_count} record(s), worth exploring by grouping and period.",
                "severity": "info",
            }
        )

    for group in groups[:1]:
        top = (group.get("rows") or [None])[0]
        if not top:
            continue
        value = _display_value(top.get("value"))
        count = int(top.get("count") or 0)
        if count:
            insights.append(
                {
                    "label_pt": f"Maior concentração em {group.get('label') or group.get('field')}: {value} ({count}).",
                    "label_en": f"Highest concentration in {group.get('label') or group.get('field')}: {value} ({count}).",
                    "severity": "info",
                }
            )

    if period_rows:
        peak = max(period_rows, key=lambda row: int(row.get("count") or 0))
        peak_count = int(peak.get("count") or 0)
        if peak_count:
            insights.append(
                {
                    "label_pt": f"Pico temporal em {peak.get('period') or peak.get('day')}: {peak_count} registo(s).",
                    "label_en": f"Time peak on {peak.get('period') or peak.get('day')}: {peak_count} record(s).",
                    "severity": "info",
                }
            )

    if comparison:
        delta = int(comparison.get("absolute_delta") or 0)
        severity = "success" if delta > 0 else "warning" if delta < 0 else "info"
        if delta:
            direction_pt = "aumentou" if delta > 0 else "reduziu"
            direction_en = "increased" if delta > 0 else "decreased"
            insights.append(
                {
                    "label_pt": f"Face ao período anterior equivalente, a actividade {direction_pt} {abs(delta)} registo(s).",
                    "label_en": f"Compared with the previous equivalent period, activity {direction_en} by {abs(delta)} record(s).",
                    "severity": severity,
                }
            )

    for numeric in numeric_summaries[:1]:
        total = _display_value(numeric.get("total"))
        average = _display_value(numeric.get("average"))
        insights.append(
            {
                "label_pt": f"{numeric.get('label') or numeric.get('field')}: total {total}, média {average}.",
                "label_en": f"{numeric.get('label') or numeric.get('field')}: total {total}, average {average}.",
                "severity": "info",
            }
        )

    return insights[:6]


def _build_generic_next_questions(
    *,
    descriptor: ResourceDescriptor,
    has_date_range: bool,
    has_search_query: bool,
    groups: list[dict[str, Any]],
    numeric_summaries: list[dict[str, Any]],
) -> list[dict[str, str]]:
    base_pt = descriptor.label_pt.lower()
    base_en = descriptor.label_en.lower()
    questions: list[dict[str, str]] = []
    if not has_date_range:
        questions.append(
            {
                "label_pt": f"Analisar {base_pt} deste mês",
                "label_en": f"Analyse {base_en} this month",
            }
        )
    if groups:
        field_label = groups[0].get("label") or groups[0].get("field") or "estado"
        questions.append(
            {
                "label_pt": f"Dividir {base_pt} por {field_label}",
                "label_en": f"Break down {base_en} by {field_label}",
            }
        )
    if numeric_summaries:
        metric_label = numeric_summaries[0].get("label") or numeric_summaries[0].get("field") or "valor"
        questions.append(
            {
                "label_pt": f"Mostrar totais e médias de {metric_label}",
                "label_en": f"Show totals and averages for {metric_label}",
            }
        )
    if not has_search_query:
        questions.append(
            {
                "label_pt": f"Pesquisar {base_pt} por nome, código ou referência",
                "label_en": f"Search {base_en} by name, code or reference",
            }
        )
    questions.append(
        {
            "label_pt": f"Comparar {base_pt} com o período anterior",
            "label_en": f"Compare {base_en} with the previous period",
        }
    )
    return questions[:4]


def _display_value(value: Any) -> str:
    if value in (None, ""):
        return "—"
    if isinstance(value, Decimal):
        value = float(value)
    if isinstance(value, float):
        return str(int(value)) if value.is_integer() else f"{value:.2f}"
    return str(value)


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
    if isinstance(value, Decimal):
        return str(value)
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
