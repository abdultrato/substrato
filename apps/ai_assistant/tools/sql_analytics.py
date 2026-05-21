from __future__ import annotations

import re
from dataclasses import dataclass
from datetime import date, datetime, time
from typing import Any

from django.db import connection
from django.utils import timezone

from apps.ai_assistant.tools.resource_catalog import normalize_text, user_can_read_resource

from .base import AiTool, AiToolContext


DATE_PATTERN = r"\b(?:\d{4}-\d{1,2}-\d{1,2}|\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\b"


@dataclass(frozen=True, slots=True)
class ParsedAnalyticQuery:
    kind: str
    start_date: date | None = None
    end_date: date | None = None
    product_query: str = ""


class SqlAnalyticsTool(AiTool):
    name = "run_sql_analytics"
    description_pt = "Executa pesquisas analíticas por SQL parametrizado para perguntas de datas, entradas e stock histórico."
    description_en = "Runs parameterized SQL analytics for date ranges, admissions and historical stock questions."
    required_groups: tuple[str, ...] = ()
    mode = "read"

    def run(self, context: AiToolContext) -> dict[str, Any]:
        message = str(context.arguments.get("message") or "")
        parsed = self._parse(message)
        if parsed.kind == "patient_entries_between":
            return self._patient_entries_between(context=context, parsed=parsed)
        if parsed.kind == "pharmacy_stock_as_of":
            return self._pharmacy_stock_as_of(context=context, parsed=parsed)
        return self._no_match(language=context.language)

    def _parse(self, message: str) -> ParsedAnalyticQuery:
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
    return has_date and (patient_entry or stock_history)


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
