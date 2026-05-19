# Política de Segurança

## Versões suportadas

| Versão | Suporte |
|---|---|
| `main` | Sim |
| releases estáveis mais recentes | Sim |
| versões antigas fora de manutenção | Não |

## Como reportar vulnerabilidades
1. Não abrir vulnerabilidades em issues públicas.
2. Reportar por email para `security@substrato.os`
3. Incluir no reporte:
   - descrição técnica;
   - impacto e vetor de exploração;
   - passos para reproduzir;
   - versão/commit afetado;
   - proposta de mitigação (se houver).

## SLA de resposta
1. Confirmação de receção: até 48 horas.
2. Triagem inicial: até 5 dias úteis.
3. Plano de correção: até 10 dias úteis para severidade alta/crítica.

## Divulgação responsável
1. A equipa valida e corrige antes de divulgar publicamente.
2. CVE/advisory pode ser publicado após patch disponível.
3. O histórico de correções deve ficar rastreável em changelog/commits.

## Medidas ativas neste repositório
1. CI com gates de qualidade, segurança e readiness.
2. Scans contínuos com `CodeQL`, `bandit`, `pip-audit` e `npm audit`.
3. Atualização automática de dependências via `Dependabot`.
