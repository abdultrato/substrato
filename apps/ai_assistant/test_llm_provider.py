"""Testes do seletor de provedor de LLM (Passo 5).

Garantem: (1) default seguro = local; (2) AI_PROVIDER=anthropic sem chave cai
para local; (3) qualquer falha do provedor Claude degrada para o local — a IA
nunca fica indisponível por causa do LLM.
"""

import pytest

from apps.ai_assistant.services.llm_provider import AnthropicLlmGateway, get_llm_gateway


def test_factory_default_e_local(settings):
    settings.AI_PROVIDER = "local"
    assert get_llm_gateway().provider == "local"


def test_factory_anthropic_sem_chave_cai_para_local(settings):
    settings.AI_PROVIDER = "anthropic"
    settings.ANTHROPIC_API_KEY = ""
    # Sem chave, available() é False → fallback para local.
    assert get_llm_gateway().provider == "local"


def test_anthropic_available_exige_chave(settings):
    settings.ANTHROPIC_API_KEY = ""
    assert AnthropicLlmGateway().available() is False


def test_build_answer_degrada_para_local_em_falha(settings):
    settings.AI_PROVIDER = "anthropic"
    settings.ANTHROPIC_API_KEY = "sk-teste"
    gateway = AnthropicLlmGateway()

    # Força falha do caminho Claude (sem rede): qualquer erro deve cair para o local.
    def boom(*args, **kwargs):
        raise RuntimeError("falha simulada do provedor externo")

    gateway._get_client = boom

    out = gateway.build_answer(
        question="Quais alertas operacionais estão activos?",
        language="pt",
        tool_results=[],
        blocked_tools=[],
    )
    assert isinstance(out, str)
    assert out.strip()  # resposta determinística do provedor local, não vazia
