from types import SimpleNamespace

import pytest

from apps.notifications.models.delivery_log import DeliveryLog
from apps.notifications.models.notification import Notification
from apps.notifications.models.notification_template import NotificationTemplate
from apps.notifications.services import NotificationService


class StubChannel:
    def __init__(self):
        self.calls = []

    def send(self, destination, message, subject=None, **kwargs):
        self.calls.append((destination, message, subject))
        return {"status": "ok"}


@pytest.mark.django_db
def test_enviar_email_sucesso_cria_log(monkeypatch, settings):
    stub_email = StubChannel()
    monkeypatch.setattr(
        "apps.notifications.services.CHANNELS",
        {Notification.Channel.EMAIL: stub_email},
        raising=False,
    )
    settings.NOTIFICACOES_EMAIL_ATIVAS = True

    service = NotificationService()
    notif = service.send(
        destination="user@example.com",
        message="Olá!",
        channel=Notification.Channel.EMAIL,
        subject="Teste",
        external_reference="ref-1",
    )

    assert notif.sent is True
    assert notif.send_error == ""
    assert notif.sent_at is not None
    assert stub_email.calls == [("user@example.com", "Olá!", "Teste")]
    assert DeliveryLog.objects.filter(notification=notif, status="sucesso").count() == 1


@pytest.mark.django_db
def test_enviar_sms_desativado_registra_ignore(monkeypatch, settings):
    stub_sms = StubChannel()
    monkeypatch.setattr(
        "apps.notifications.services.CHANNELS",
        {Notification.Channel.SMS: stub_sms},
        raising=False,
    )
    settings.NOTIFICACOES_SMS_ATIVAS = False  # mantém desativado

    service = NotificationService()
    notif = service.send(
        destination="+258840000000",
        message="Seu código",
        channel=Notification.Channel.SMS,
        external_reference="code-123",
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

    service = NotificationService()
    first = service.send(
        destination="dup@example.com",
        message="Primeira",
        channel=Notification.Channel.EMAIL,
        event_type=Notification.EventType.FATURA_EMITIDA,
        external_reference="fat-1",
    )
    second = service.send(
        destination="dup@example.com",
        message="Segunda deveria reutilizar",
        channel=Notification.Channel.EMAIL,
        event_type=Notification.EventType.FATURA_EMITIDA,
        external_reference="fat-1",
    )

    assert first.pk == second.pk  # reused the existing notification
    assert Notification.objects.filter(recipient="dup@example.com").count() == 1


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

    fake_patient = SimpleNamespace(email="pac@example.com", contact="+258840000001")

    service = NotificationService()
    notifications = service.send_to_patient(
        patient=fake_patient,
        message="Pronto",
        subject="Resultado",
        event_type=Notification.EventType.RESULTADO_DISPONIVEL,
        external_reference="req-99",
    )

    assert len(notifications) == 2
    assert stub_email.calls
    assert stub_sms.calls
    assert DeliveryLog.objects.filter(status="sucesso").count() == 2


@pytest.mark.django_db
def test_template_str_and_ordering():
    t1 = NotificationTemplate.objects.create(name="B", content="b")
    t2 = NotificationTemplate.objects.create(name="A", content="a")

    nomes = list(NotificationTemplate.objects.values_list("name", flat=True))
    assert nomes == ["A", "B"]
    assert str(t1) == "B"
    assert str(t2) == "A"


StubCanal = StubChannel
test_enviar_nao_duplica_mesma_referencia = test_send_does_not_duplicate_same_reference
test_enviar_validacoes_basicas = test_send_basic_validations
test_enviar_para_patient_com_email_e_sms = test_send_to_patient_with_email_and_sms
