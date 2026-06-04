from decimal import Decimal

from django.core.exceptions import ValidationError

from apps.billing.models.invoice import Invoice
from domain.clinical.result_state import ResultState

from .models.notification import Notification
from .services import NotificationService


DEFAULT_INTERACTIVE_CHANNELS = (
    Notification.Channel.EMAIL,
    Notification.Channel.WHATSAPP,
)
ALLOWED_CHANNELS = {
    Notification.Channel.EMAIL,
    Notification.Channel.SMS,
    Notification.Channel.WHATSAPP,
}


def _payload_value(payload, *keys):
    for key in keys:
        value = payload.get(key)
        if value not in (None, ""):
            return value
    return None


def _channels_from_payload(payload):
    raw = _payload_value(payload, "channels", "canais", "channel", "canal")
    if raw in (None, ""):
        return DEFAULT_INTERACTIVE_CHANNELS

    if isinstance(raw, str):
        lowered = raw.strip().lower()
        if lowered in {"all", "todos"}:
            return DEFAULT_INTERACTIVE_CHANNELS
        raw = [item.strip() for item in raw.split(",")]

    normalized = []
    for item in raw:
        channel = str(item).strip().lower()
        if not channel:
            continue
        if channel not in ALLOWED_CHANNELS:
            raise ValidationError(f"Canal de notificação inválido: {channel}.")
        if channel not in normalized:
            normalized.append(channel)

    if not normalized:
        raise ValidationError("Informe pelo menos um canal de notificação.")
    return tuple(normalized)


def _recipient_overrides(payload):
    email = _payload_value(
        payload,
        "email",
        "recipient_email",
        "destinatario_email",
        "email_acompanhante",
        "companion_email",
    )
    phone = _payload_value(
        payload,
        "phone",
        "telefone",
        "contacto",
        "recipient_phone",
        "destinatario_telefone",
        "telefone_acompanhante",
        "companion_phone",
    )
    return email, phone


def _resolve_invoice_patient(invoice):
    patient = getattr(invoice, "patient", None)
    if patient:
        return patient

    for relation_name in ("request", "sale", "procedure", "consultation", "surgery"):
        related = getattr(invoice, relation_name, None)
        patient = getattr(related, "patient", None)
        if patient:
            return patient
    return None


def _patient_name(patient):
    raw = getattr(patient, "name", None) or getattr(patient, "nome", None) or ""
    name = str(raw).strip()
    return name or "utente"


def _money(value):
    try:
        return str(Decimal(value or 0).quantize(Decimal("0.01")))
    except Exception:
        return "0.00"


def _ensure_reachable(patient, email, phone, channels):
    patient_email = email or getattr(patient, "email", None)
    patient_phone = phone or getattr(patient, "contact", None)

    has_email_target = Notification.Channel.EMAIL in channels and bool(patient_email)
    has_phone_target = any(
        channel in channels for channel in (Notification.Channel.SMS, Notification.Channel.WHATSAPP)
    ) and bool(patient_phone)

    if not has_email_target and not has_phone_target:
        raise ValidationError(
            "Não existe email ou telefone disponível para os canais selecionados. "
            "Atualize os dados do paciente ou informe contacto do acompanhante."
        )


def _summarize_notifications(notifications):
    rows = [
        {
            "id": notification.id,
            "channel": notification.channel,
            "recipient": notification.recipient,
            "sent": notification.sent,
            "send_error": notification.send_error,
        }
        for notification in notifications
    ]
    return {
        "total": len(rows),
        "sent": sum(1 for row in rows if row["sent"]),
        "notifications": rows,
    }


def send_paid_invoice_notification(invoice, payload=None):
    payload = payload or {}
    if invoice.status != Invoice.Status.PAID:
        raise ValidationError("A notificação de fatura só pode ser enviada após pagamento confirmado.")

    patient = _resolve_invoice_patient(invoice)
    if not patient:
        raise ValidationError("Não foi possível identificar o paciente desta fatura.")

    channels = _channels_from_payload(payload)
    email, phone = _recipient_overrides(payload)
    _ensure_reachable(patient, email, phone, channels)

    invoice_code = invoice.custom_id or invoice.pk
    patient_label = _patient_name(patient)
    subject = "Fatura emitida e pagamento confirmado"
    message = (
        f"Olá {patient_label}. A sua fatura {invoice_code} foi emitida e o pagamento foi confirmado. "
        f"Valor total: {_money(invoice.total)}. Pode solicitar o PDF da fatura e o recibo na recepção."
    )

    notifications = NotificationService().send_to_patient(
        patient=patient,
        email=email,
        phone=phone,
        channels=channels,
        subject=subject,
        message=message,
        event_type=Notification.EventType.FATURA_EMITIDA,
        external_reference=f"invoice:{invoice.pk}:paid-notification",
    )

    return {
        "status": "processed",
        "message": "Notificação de fatura processada.",
        "subject": subject,
        "channels": list(channels),
        **_summarize_notifications(notifications),
    }


def send_lab_results_notification(lab_request, payload=None):
    payload = payload or {}
    if lab_request.status != ResultState.VALIDATED:
        raise ValidationError("A notificação de resultados só pode ser enviada após validação dos resultados.")

    patient = getattr(lab_request, "patient", None)
    if not patient:
        raise ValidationError("Não foi possível identificar o paciente desta requisição.")

    channels = _channels_from_payload(payload)
    email, phone = _recipient_overrides(payload)
    _ensure_reachable(patient, email, phone, channels)

    request_code = lab_request.custom_id or lab_request.pk
    patient_label = _patient_name(patient)
    subject = "Resultados de exames disponíveis"
    message = (
        f"Olá {patient_label}. Os resultados da requisição de exames {request_code} já foram emitidos "
        "e estão disponíveis para consulta. Por favor contacte a recepção se precisar do documento em PDF."
    )

    notifications = NotificationService().send_to_patient(
        patient=patient,
        email=email,
        phone=phone,
        channels=channels,
        subject=subject,
        message=message,
        event_type=Notification.EventType.RESULTADO_DISPONIVEL,
        external_reference=f"lab-request:{lab_request.pk}:results-notification",
    )

    return {
        "status": "processed",
        "message": "Notificação de resultados processada.",
        "subject": subject,
        "channels": list(channels),
        **_summarize_notifications(notifications),
    }
