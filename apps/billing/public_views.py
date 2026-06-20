"""Página pública de validação de fatura (apontada pelo QR do documento).

Mostra apenas dados mínimos e não sensíveis para confirmar a autenticidade e o
estado do documento, identificado por um hash não adivinhável.
"""

from __future__ import annotations

from html import escape

from django.http import HttpResponse
from django.utils import timezone
from django.views.decorators.http import require_GET

from apps.billing.models.invoice import Invoice

_STATUS_LABEL = {
    "RASC": "Rascunho (não emitida)",
    "EMIT": "Emitida",
    "PAGA": "Paga",
    "CANC": "Cancelada",
}

_CURRENCY_NAMES = {
    "MZN": "Metical",
    "USD": "Dólar americano",
    "EUR": "Euro",
    "ZAR": "Rand",
}


def _currency_label(code: str | None) -> str:
    normalized = (code or "MZN").strip().upper() or "MZN"
    name = _CURRENCY_NAMES.get(normalized, normalized)
    return f"{name} ({normalized})"


def _page(title: str, body: str, status: int = 200) -> HttpResponse:
    html = f"""<!doctype html>
<html lang="pt"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{escape(title)}</title>
<style>
 body{{font-family:system-ui,Segoe UI,Helvetica,Arial,sans-serif;margin:0;background:#f1f5f9;color:#0f172a}}
 .card{{max-width:560px;margin:6vh auto;background:#fff;border:1px solid #e2e8f0;border-radius:16px;
        box-shadow:0 6px 24px rgba(15,23,42,.06);overflow:hidden}}
 .head{{padding:18px 22px;border-bottom:1px solid #e2e8f0}}
 .head h1{{font-size:18px;margin:0}}
 .body{{padding:18px 22px}}
 .row{{display:flex;justify-content:space-between;gap:12px;padding:7px 0;border-bottom:1px solid #f1f5f9;font-size:14px}}
 .row .k{{color:#64748b}} .row .v{{font-weight:600;text-align:right}}
 .badge{{display:inline-block;padding:3px 10px;border-radius:999px;font-size:12px;font-weight:700}}
 .ok{{background:#dcfce7;color:#166534}} .warn{{background:#fef9c3;color:#854d0e}} .bad{{background:#fee2e2;color:#991b1b}}
 .foot{{padding:12px 22px;color:#94a3b8;font-size:12px;border-top:1px solid #e2e8f0}}
</style></head>
<body><div class="card">{body}
<div class="foot">Validação emitida em {escape(timezone.localtime().strftime('%d/%m/%Y %H:%M'))}.</div>
</div></body></html>"""
    return HttpResponse(html, status=status)


@require_GET
def verify_invoice(request, code: str):
    invoice = (
        Invoice.all_objects.filter(verification_hash=code)
        .select_related("patient", "fiscal_client", "tenant")
        .first()
        if code
        else None
    )

    if invoice is None:
        return _page(
            "Documento não encontrado",
            '<div class="head"><h1>Documento não encontrado</h1></div>'
            '<div class="body"><p>Não existe nenhuma fatura associada a este código de validação.</p></div>',
            status=404,
        )

    config = getattr(getattr(invoice, "tenant", None), "configuracao", None)
    entity_name = (getattr(config, "legal_name", "") or getattr(invoice.tenant, "name", "") or "—")
    entity_nuit = getattr(config, "nuit", "") or ""
    currency_code = getattr(config, "currency", "") if config is not None else ""

    fiscal_bits = [f"Tipo de moeda: {_currency_label(currency_code)}"]
    if entity_nuit:
        fiscal_bits.append(f"NUIT emitente: {entity_nuit}")
    if getattr(config, "license_number", ""):
        fiscal_bits.append(f"Alvará: {config.license_number}")
    if getattr(config, "health_unit_registration", ""):
        fiscal_bits.append(f"Reg. unidade: {config.health_unit_registration}")
    fiscal_line = " • ".join(fiscal_bits)

    fc = invoice.fiscal_client_details()
    status_code = invoice.status
    status_label = _STATUS_LABEL.get(status_code, status_code)
    badge_class = "ok" if status_code in {"EMIT", "PAGA"} else ("bad" if status_code == "CANC" else "warn")

    def row(k, v):
        return f'<div class="row"><span class="k">{escape(k)}</span><span class="v">{escape(str(v or "—"))}</span></div>'

    body = (
        f'<div class="head"><h1>{escape(entity_name)}</h1>'
        + (f'<div style="color:#64748b;font-size:13px">NUIT: {escape(entity_nuit)}</div>' if entity_nuit else "")
        + "</div><div class=\"body\">"
        + f'<div class="row"><span class="k">Estado</span>'
          f'<span class="v"><span class="badge {badge_class}">{escape(status_label)}</span></span></div>'
        + row("Fatura n.º", invoice.custom_id)
        + row("Identificação fiscal", fiscal_line)
        + row("Data", timezone.localtime(invoice.created_at).strftime("%d/%m/%Y %H:%M") if invoice.created_at else "—")
        + row("Cliente fiscal", fc.get("name"))
        + row("Total (com IVA)", invoice.total or 0)
        + "</div>"
    )
    return _page(f"Validação da fatura {invoice.custom_id}", body)
