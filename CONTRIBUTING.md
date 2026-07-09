# Contribuindo para o Substrato

Obrigado por considerar contribuir com o Substrato.

## Antes de começar
- Leia o [README.md](README.md) e a documentação consolidada em [SUBSTRATO.md](SUBSTRATO.md).
- Entenda o contexto do domínio afetado antes de alterar modelos, APIs, interfaces ou regras operacionais.
- Considere impacto em tenant, RBAC, auditoria, logs e dados sensíveis.

## Fluxo recomendado
1. Trabalhe de forma incremental e com escopo claro.
2. Atualize testes e documentação no mesmo ciclo da alteração.
3. Valide localmente com os gates relevantes antes de publicar.
4. Abra uma pull request com resumo, contexto e evidências de validação.

## Política do repositório
- O desenvolvimento atual segue a branch main diretamente.
- Evite alterações não relacionadas no mesmo commit.
- Se a mudança afetar risco operacional, documente mitigação, rollback e impacto.

## Padrões de qualidade
- Prefira código legível, bem nomeado e com responsabilidade clara.
- Preserve padrões do projeto e não introduza dependências sem justificativa.
- Atualize documentação técnica quando houver mudança em comportamento ou contrato.
