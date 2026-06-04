from types import SimpleNamespace
from uuid import uuid4

import pytest
from django.conf import settings as django_settings

from apps.notifications.models.delivery_log import DeliveryLog
from apps.notifications.models.notification import Notification
from apps.notifications.models.notification_template import NotificationTemplate
from apps.notifications.services import NotificationService


@pytest.fixture
def settings(monkeypatch):
    class SettingsProxy:
        def __getattr__(self, name):
            return getattr(django_settings, name)

        def __setattr__(self, name, value):
            monkeypatch.setattr(django_settings, name, value, raising=False)

    return SettingsProxy()


class StubChannel:
    def __init__(self):
        self.calls = []

    def send(self, destination, message, subject=None, **kwargs):
        self.calls.append((destination, message, subject))
        return {"status": "ok"}


@pytest.mark.django_db
def test_send_email_success_creates_log(monkeypatch, settings):
    stub_email = StubChannel()
    monkeypatch.setattr(
        "apps.notifications.services.CHANNELS",
        {Notification.Channel.EMAIL: stub_email},
        raising=False,
    )
    settings.NOTIFICACOES_EMAIL_ATIVAS = True
    suffix = uuid4().hex

    service = NotificationService()
    notif = service.send(
        destination=f"user-{suffix}@example.com",
        message="Olá!",
        channel=Notification.Channel.EMAIL,
        subject="Teste",
        external_reference=f"ref-{suffix}",
    )

    assert notif.sent is True
    assert notif.send_error == ""
    assert notif.sent_at is not None
    assert stub_email.calls == [(f"user-{suffix}@example.com", "Olá!", "Teste")]
    assert DeliveryLog.objects.filter(notification=notif, status="sucesso").count() == 1


@pytest.mark.django_db
def test_send_sms_disabled_logs_ignored(monkeypatch, settings):
    stub_sms = StubChannel()
    monkeypatch.setattr(
        "apps.notifications.services.CHANNELS",
        {Notification.Channel.SMS: stub_sms},
        raising=False,
    )
    settings.NOTIFICACOES_SMS_ATIVAS = False  # mantém desativado
    suffix = uuid4().hex

    service = NotificationService()
    notif = service.send(
        destination="+258840000000",
        message="Seu código",
        channel=Notification.Channel.SMS,
        external_reference=f"code-{suffix}",
    )

    assert notif.sent is False
    assert DeliveryLog.objects.filter(notification=notif, status="ignorado").exists()
    assert stub_sms.calls == []  # não tentou enviar


@pytest.mark.django_db
def test_send_does_not_duplicate_same_reference(monkeypatch, settings):
    stub_email = StubChannel()
    monkeypatch.setattr(
        "apps.notifications.services.CHANNELS",
        {Notification.Channel.EMAIL: stub_email},
        raising=False,
    )
    settings.NOTIFICACOES_EMAIL_ATIVAS = True
    suffix = uuid4().hex
    recipient = f"dup-{suffix}@example.com"
    external_reference = f"fat-{suffix}"

    service = NotificationService()
    first = service.send(
        destination=recipient,
        message="Primeira",
        channel=Notification.Channel.EMAIL,
        event_type=Notification.EventType.FATURA_EMITIDA,
        external_reference=external_reference,
    )
    second = service.send(
        destination=recipient,
        message="Segunda deveria reutilizar",
        channel=Notification.Channel.EMAIL,
        event_type=Notification.EventType.FATURA_EMITIDA,
        external_reference=external_reference,
    )

    assert first.pk == second.pk  # reused the existing notification
    assert Notification.objects.filter(recipient=recipient).count() == 1


@pytest.mark.django_db
def test_send_basic_validations(monkeypatch):
    service = NotificationService()

    with pytest.raises(ValueError):
        service.send(destination="", message="oi", channel=Notification.Channel.EMAIL)

    with pytest.raises(ValueError):
        service.send(destination="a@b.com", message="oi", channel="push")


@pytest.mark.django_db
def test_send_to_patient_with_email_and_sms(monkeypatch, settings):
    stub_email = StubChannel()
    stub_sms = StubChannel()
    monkeypatch.setattr(
        "apps.notifications.services.CHANNELS",
        {
            Notification.Channel.EMAIL: stub_email,
            Notification.Channel.SMS: stub_sms,
        },
        raising=False,
    )
    settings.NOTIFICACOES_EMAIL_ATIVAS = True
    settings.NOTIFICACOES_SMS_ATIVAS = True
    settings.SMS_API_URL = "http://sms.test"
    settings.SMS_API_KEY = "key"
    suffix = uuid4().hex

    fake_patient = SimpleNamespace(email=f"pac-{suffix}@example.com", contact=f"+25884{suffix[:6]}")

    service = NotificationService()
    notifications = service.send_to_patient(
        patient=fake_patient,
        message="Pronto",
        subject="Resultado",
        event_type=Notification.EventType.RESULTADO_DISPONIVEL,
        external_reference=f"req-{suffix}",
    )

    assert len(notifications) == 2
    assert stub_email.calls
    assert stub_sms.calls
    assert DeliveryLog.objects.filter(notification__in=notifications, status="sucesso").count() == 2


@pytest.mark.django_db
def test_send_to_patient_with_email_and_whatsapp(monkeypatch, settings):
    stub_email = StubChannel()
    stub_whatsapp = StubChannel()
    monkeypatch.setattr(
        "apps.notifications.services.CHANNELS",
        {
            Notification.Channel.EMAIL: stub_email,
            Notification.Channel.WHATSAPP: stub_whatsapp,
        },
        raising=False,
    )
    settings.NOTIFICACOES_EMAIL_ATIVAS = True
    settings.NOTIFICACOES_WHATSAPP_ATIVAS = True
    settings.WHATSAPP_API_URL = "http://whatsapp.test"
    settings.WHATSAPP_API_KEY = "key"
    suffix = uuid4().hex

    fake_patient = SimpleNamespace(email=f"pac-{suffix}@example.com", contact=f"+25885{suffix[:6]}")

    service = NotificationService()
    notifications = service.send_to_patient(
        patient=fake_patient,
        message="Fatura paga",
        subject="Fatura",
        event_type=Notification.EventType.FATURA_EMITIDA,
        external_reference=f"fat-{suffix}",
        channels=[Notification.Channel.EMAIL, Notification.Channel.WHATSAPP],
    )

    assert len(notifications) == 2
    assert stub_email.calls == [(f"pac-{suffix}@example.com", "Fatura paga", "Fatura")]
    assert stub_whatsapp.calls == [(f"+25885{suffix[:6]}", "Fatura paga", "Fatura")]
    assert DeliveryLog.objects.filter(notification__in=notifications, status="sucesso").count() == 2


@pytest.mark.django_db
def test_template_str_and_ordering():
    suffix = uuid4().hex
    name_b = f"B-{suffix}"
    name_a = f"A-{suffix}"
    t1 = NotificationTemplate.objects.create(name=name_b, content="b")
    t2 = NotificationTemplate.objects.create(name=name_a, content="a")

    nomes = list(NotificationTemplate.objects.filter(name__in=[name_a, name_b]).values_list("name", flat=True))
    assert nomes == [name_a, name_b]
    assert str(t1) == name_b
    assert str(t2) == name_a
