"""Gerador genérico para documentos PDF de apps sem layout específico."""

from __future__ import annotations

from collections.abc import Iterable
from datetime import date, datetime, time
from decimal import Decimal
import io

from django.apps import apps as django_apps
from django.utils import timezone
from django.utils.text import slugify
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

MAX_ROWS = 40
MAX_TEXT_LENGTH = 500


def _resolve_app_display_name(app_label: str) -> str:
    """Resolve nome amigável da app usando AppConfig (label ou módulo)."""
    resolved = (app_label or "").strip()
    if not resolved:
        return "Aplicação"

    try:
        for config in django_apps.get_app_configs():
            module_name = config.name.split(".")[-1]
            if config.label == resolved or module_name == resolved:
                verbose = str(getattr(config, "verbose_name", "") or "").strip()
                if verbose:
                    return verbose
                break
    except Exception:
        pass

    return resolved.replace("_", " ").title()


def _format_value(value) -> str:
    """Converte valores Python/Django para texto seguro de PDF."""
    if value is None:
        return "-"
    if isinstance(value, bool):
        return "Sim" if value else "Nao"
    if isinstance(value, datetime):
        return value.strftime("%Y-%m-%d %H:%M:%S")
    if isinstance(value, date):
        return value.strftime("%Y-%m-%d")
    if isinstance(value, time):
        return value.strftime("%H:%M:%S")
    if isinstance(value, Decimal):
        return f"{value}"

    text = str(value).strip()
    if not text:
        return "-"
    if len(text) > MAX_TEXT_LENGTH:
        return f"{text[:MAX_TEXT_LENGTH - 3]}..."
    return text


def _extract_rows(obj) -> list[tuple[str, str]]:
    """
    Extrai campos concretos do modelo para compor uma tabela.

    Mantem um limite de linhas para evitar PDFs enormes em objetos muito ricos.
    """
    meta = getattr(obj, "_meta", None)
    rows: list[tuple[str, str]] = []

    if meta is not None and hasattr(meta, "concrete_fields"):
        for field in meta.concrete_fields:
            field_name = getattr(field, "name", None)
            if not field_name:
                continue
            field_label = str(getattr(field, "verbose_name", field_name)).replace("_", " ").title()
            raw_value = getattr(obj, field_name, None)
            rows.append((field_label, _format_value(raw_value)))
            if len(rows) >= MAX_ROWS:
                break
    else:
        for field_name in ("id", "name", "title", "description"):
            if hasattr(obj, field_name):
                rows.append((field_name.replace("_", " ").title(), _format_value(getattr(obj, field_name))))

    if not rows:
        rows.append(("Objeto", _format_value(obj)))

    return rows


def _build_filename(app_label: str, model_name: str, obj_pk) -> str:
    safe_app = slugify(app_label or "documento") or "documento"
    safe_model = slugify(model_name or "modelo") or "modelo"
    safe_pk = "sem-id" if obj_pk is None else str(obj_pk)
    return f"{safe_app}_{safe_model}_{safe_pk}.pdf"


def _iter_table_data(rows: Iterable[tuple[str, str]], text_style: ParagraphStyle):
    yield ["Campo", "Valor"]
    for key, value in rows:
        value_html = value.replace("\n", "<br/>")
        yield [Paragraph(key, text_style), Paragraph(value_html, text_style)]


def generate_generic_app_pdf(
    obj,
    request=None,
    *,
    app_label: str | None = None,
    title: str | None = None,
):
    """Gera um PDF genérico para qualquer objeto Django."""
    meta = getattr(obj, "_meta", None)
    resolved_app = app_label or getattr(meta, "app_label", "app")
    model_name = getattr(meta, "model_name", "objeto")
    resolved_title = title or f"Documento de {_resolve_app_display_name(resolved_app)}"
    generated_at = timezone.localtime().strftime("%Y-%m-%d %H:%M:%S")

    rows = _extract_rows(obj)

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=18 * mm,
        rightMargin=18 * mm,
        topMargin=18 * mm,
        bottomMargin=18 * mm,
        title=resolved_title,
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "GenericTitle",
        parent=styles["Heading1"],
        fontName="Helvetica-Bold",
        fontSize=16,
        leading=18,
        spaceAfter=8,
    )
    text_style = ParagraphStyle(
        "GenericText",
        parent=styles["BodyText"],
        fontName="Helvetica",
        fontSize=9,
        leading=11,
    )

    info_line = (
        f"Aplicação: <b>{_resolve_app_display_name(resolved_app)}</b> &nbsp;|&nbsp; "
        f"Modelo: <b>{model_name}</b> &nbsp;|&nbsp; "
        f"ID: <b>{_format_value(getattr(obj, 'pk', None))}</b>"
    )

    elements = [
        Paragraph(resolved_title, title_style),
        Paragraph(info_line, text_style),
        Paragraph(f"Gerado em: {generated_at}", text_style),
        Spacer(1, 6),
    ]

    table_data = list(_iter_table_data(rows, text_style))
    table = Table(table_data, colWidths=[60 * mm, None], repeatRows=1)
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#EDEDED")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.black),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, 0), 9),
                ("ALIGN", (0, 0), (-1, -1), "LEFT"),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#D0D0D0")),
                ("LEFTPADDING", (0, 0), (-1, -1), 5),
                ("RIGHTPADDING", (0, 0), (-1, -1), 5),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ]
        )
    )
    elements.append(table)

    doc.build(elements)
    buffer.seek(0)
    filename = _build_filename(resolved_app, model_name, getattr(obj, "pk", None))
    return buffer.getvalue(), filename
