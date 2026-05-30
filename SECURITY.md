# Política de Segurança

## Propósito

A segurança do Substrato protege o maior valor do projecto: confiança operacional entre tenants, utilizadores, dados clínicos, educacionais, financeiros e logísticos. Nenhuma fase beta deve avançar se tenant, RBAC, auditoria, segredos e dependências não tiverem validação objectiva.

## Segurança no caminho até produção beta

1. **Fundação técnica:** bloquear configurações inseguras, remover segredos do código, activar scans e documentar variáveis obrigatórias.
2. **Beta interna:** testar autenticação, autorização, escopo de tenant, logs de auditoria e permissões por perfil.
3. **Beta fechada:** validar backups, rollback, resposta a incidentes, rotação de credenciais e revisão de dependências.
4. **Produção beta:** operar com monitorização, triagem de vulnerabilidades, janelas de correcção e processo de divulgação responsável.
5. **Production-ready:** manter RPO/RTO ensaiados, scans contínuos, gestão formal de incidentes e revisão periódica de acessos.

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

## Checklist para alterações de código
1. Confirmar que a alteração não expõe dados sensíveis em logs, PDFs, respostas HTTP, prompts ou documentação.
2. Confirmar que permissões visuais no frontend não substituem bloqueios reais no backend.
3. Adicionar ou ajustar testes quando a alteração tocar autenticação, autorização, tenant, auditoria, pagamentos, saúde ou dados pessoais.
4. Actualizar runbook, variáveis de ambiente e plano de rollback quando houver impacto operacional.
