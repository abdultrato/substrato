from types import SimpleNamespace

import pytest

from aplicativos.notificacoes.modelos.log_envio import LogEnvio
from aplicativos.notificacoes.modelos.notificacao import Notificacao
from aplicativos.notificacoes.modelos.template import TemplateNotificacao
from aplicativos.notificacoes.servicos import ServicoNotificacao


class StubCanal:
    def __init__(self):
        self.calls = []

    def enviar(self, destino, mensagem, assunto=None, **kwargs):
        self.calls.append((destino, mensagem, assunto))
        return {"status": "ok"}


@pytest.mark.django_db
def test_enviar_email_sucesso_cria_log(monkeypatch, settings):
    stub_email = StubCanal()
    monkeypatch.setattr(
        "aplicativos.notificacoes.servicos.CANAIS",
        {Notificacao.Canal.EMAIL: stub_email},
        raising=False,
    )
    settings.NOTIFICACOES_EMAIL_ATIVAS = True

    servico = ServicoNotificacao()
    notif = servico.enviar(
        destino="user@example.com",
        mensagem="Olá!",
        canal=Notificacao.Canal.EMAIL,
        assunto="Teste",
        referencia_externa="ref-1",
    )

    assert notif.enviada is True
    assert notif.erro_envio == ""
    assert notif.enviado_em is not None
    assert stub_email.calls == [("user@example.com", "Olá!", "Teste")]
    assert LogEnvio.objects.filter(notificacao=notif, status="sucesso").count() == 1


@pytest.mark.django_db
def test_enviar_sms_desativado_registra_ignore(monkeypatch, settings):
    stub_sms = StubCanal()
    monkeypatch.setattr(
        "aplicativos.notificacoes.servicos.CANAIS",
        {Notificacao.Canal.SMS: stub_sms},
        raising=False,
    )
    settings.NOTIFICACOES_SMS_ATIVAS = False  # mantém desativado

    servico = ServicoNotificacao()
    notif = servico.enviar(
        destino="+258840000000",
        mensagem="Seu código",
        canal=Notificacao.Canal.SMS,
        referencia_externa="code-123",
    )

    assert notif.enviada is False
    assert LogEnvio.objects.filter(notificacao=notif, status="ignorado").exists()
    assert stub_sms.calls == []  # não tentou enviar


@pytest.mark.django_db
def test_enviar_nao_duplica_mesma_referencia(monkeypatch, settings):
    stub_email = StubCanal()
    monkeypatch.setattr(
        "aplicativos.notificacoes.servicos.CANAIS",
        {Notificacao.Canal.EMAIL: stub_email},
        raising=False,
    )
    settings.NOTIFICACOES_EMAIL_ATIVAS = True

    servico = ServicoNotificacao()
    primeiro = servico.enviar(
        destino="dup@example.com",
        mensagem="Primeira",
        canal=Notificacao.Canal.EMAIL,
        tipo_evento=Notificacao.TipoEvento.FATURA_EMITIDA,
        referencia_externa="fat-1",
    )
    segundo = servico.enviar(
        destino="dup@example.com",
        mensagem="Segunda deveria reutilizar",
        canal=Notificacao.Canal.EMAIL,
        tipo_evento=Notificacao.TipoEvento.FATURA_EMITIDA,
        referencia_externa="fat-1",
    )

    assert primeiro.pk == segundo.pk  # reutilizou existente
    assert Notificacao.objects.filter(destinatario="dup@example.com").count() == 1


@pytest.mark.django_db
def test_enviar_validacoes_basicas(monkeypatch):
    servico = ServicoNotificacao()

    with pytest.raises(ValueError):
        servico.enviar(destino="", mensagem="oi", canal=Notificacao.Canal.EMAIL)

    with pytest.raises(ValueError):
        servico.enviar(destino="a@b.com", mensagem="oi", canal="push")


@pytest.mark.django_db
def test_enviar_para_paciente_com_email_e_sms(monkeypatch, settings):
    stub_email = StubCanal()
    stub_sms = StubCanal()
    monkeypatch.setattr(
        "aplicativos.notificacoes.servicos.CANAIS",
        {
            Notificacao.Canal.EMAIL: stub_email,
            Notificacao.Canal.SMS: stub_sms,
        },
        raising=False,
    )
    settings.NOTIFICACOES_EMAIL_ATIVAS = True
    settings.NOTIFICACOES_SMS_ATIVAS = True
    settings.SMS_API_URL = "http://sms.test"
    settings.SMS_API_KEY = "key"

    paciente_fake = SimpleNamespace(email="pac@example.com", contacto="+258840000001")

    servico = ServicoNotificacao()
    notificacoes = servico.enviar_para_paciente(
        paciente=paciente_fake,
        mensagem="Pronto",
        assunto="Resultado",
        tipo_evento=Notificacao.TipoEvento.RESULTADO_DISPONIVEL,
        referencia_externa="req-99",
    )

    assert len(notificacoes) == 2
    assert stub_email.calls
    assert stub_sms.calls
    assert LogEnvio.objects.filter(status="sucesso").count() == 2


@pytest.mark.django_db
def test_template_str_and_ordering():
    t1 = TemplateNotificacao.objects.create(nome="B", conteudo="b")
    t2 = TemplateNotificacao.objects.create(nome="A", conteudo="a")

    nomes = list(TemplateNotificacao.objects.values_list("nome", flat=True))
    assert nomes == ["A", "B"]
    assert str(t1) == "B"
    assert str(t2) == "A"
