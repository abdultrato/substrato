# Readiness — Laboratório Clínico

Checklist de prontidão do módulo de Laboratório Clínico para beta do Substrato.

Este documento define o que precisa estar funcional, exposto no frontend, protegido por permissões e validado por testes antes de considerar o laboratório clínico como `beta-ready`.

---

## Objectivo do módulo

O Laboratório Clínico deve suportar o fluxo operacional completo:

```text
Paciente → Requisição → Itens/Exames → Colheita → Amostra → Recepção/Rejeição → Lista de Trabalho → Resultado → Validação → Laudo
```

O módulo só deve ser considerado pronto quando esse fluxo puder ser executado por perfis reais, com rastreabilidade, tenant isolation, auditoria e tratamento adequado de erros.

---

## Status geral

| Área | Status inicial | Prioridade |
| --- | --- | --- |
| Requisições laboratoriais | parcial | crítica |
| Itens de requisição | corrigir | crítica |
| Colheitas | crítico | crítica |
| Amostras | crítico | crítica |
| Recepção de amostras | crítico | crítica |
| Rejeições de amostras | crítico | alta |
| Listas de trabalho | crítico | alta |
| Resultados | crítico | crítica |
| Validações | crítico | crítica |
| Laudos | crítico | crítica |
| Microbiologia | crítico | média |
| Biologia molecular | crítico | média |
| Baciloscopia | crítico | média |
| Qualidade laboratorial | crítico | alta |
| Biossegurança laboratorial | crítico | alta |

---

## Perfis envolvidos

| Perfil | Permissões esperadas |
| --- | --- |
| Recepção | Criar requisição, selecionar exames, informar médico solicitante, acompanhar estado. |
| Técnico de colheita | Confirmar colheita, identificar amostra, encaminhar amostra. |
| Técnico de laboratório | Receber amostra, lançar resultado, consultar lista de trabalho. |
| Supervisor/Gestor laboratorial | Validar resultado, rejeitar amostra, rever inconformidades. |
| Médico/Clínico | Consultar resultados e laudos autorizados. |
| Administrador | Configurar exames, setores, painéis, permissões e parâmetros. |

---

## Fluxo 1 — Catálogo laboratorial

### Backend

- [ ] Setores do laboratório possuem endpoint de listagem.
- [ ] Setores do laboratório possuem endpoint de detalhe.
- [ ] Exames laboratoriais possuem endpoint de listagem.
- [ ] Exames laboratoriais possuem endpoint de detalhe.
- [ ] Exames laboratoriais possuem filtros por nome, setor, código e estado.
- [ ] Painéis de exames possuem endpoint de listagem.
- [ ] Painéis de exames possuem endpoint de detalhe.
- [ ] Painéis permitem vincular múltiplos exames.
- [ ] Endpoints aparecem no OpenAPI/schema.
- [ ] RBAC aplicado aos endpoints.
- [ ] Tenant isolation validado quando aplicável.

### Frontend

- [ ] Setores aparecem no menu/local correcto.
- [ ] Exames aparecem no menu/local correcto.
- [ ] Painéis aparecem no menu/local correcto.
- [ ] Lista de exames ordenada alfabeticamente.
- [ ] Campo de seleção de exame permite digitar.
- [ ] Campo filtra exames enquanto o utilizador digita.
- [ ] Clicar num exame seleciona/adiciona correctamente.
- [ ] Estados de loading, vazio e erro tratados.

### Testes mínimos

- [ ] Teste automatizado de listagem de exames.
- [ ] Teste automatizado de filtro por nome do exame.
- [ ] Teste manual de seleção com digitação progressiva.

---

## Fluxo 2 — Requisição laboratorial

### Backend

- [ ] Requisição possui endpoint de listagem.
- [ ] Requisição possui endpoint de detalhe.
- [ ] Requisição possui endpoint de criação.
- [ ] Requisição possui endpoint de edição quando permitido.
- [ ] Requisição suporta paciente obrigatório.
- [ ] Requisição suporta médico solicitante quando criada pela recepção.
- [ ] Requisição suporta múltiplos exames.
- [ ] Itens da requisição ficam vinculados à requisição.
- [ ] Itens da requisição não devem ser tratados como recurso operacional independente quando a regra exige segunda camada.
- [ ] Requisição possui estados claros: rascunho, solicitada, colhida, em processamento, validada, laudada, cancelada.
- [ ] Histórico/auditoria regista alterações críticas.

### Frontend

- [ ] Página de requisições lista pedidos laboratoriais.
- [ ] Clique numa requisição abre detalhe.
- [ ] Itens aparecem dentro do detalhe da requisição.
- [ ] Itens não aparecem como lista solta no frontend principal.
- [ ] Criar requisição permite escolher paciente.
- [ ] Criar requisição permite adicionar exames por busca filtrável.
- [ ] Criar requisição permite adicionar mais de um exame.
- [ ] Criar requisição permite médico solicitante quando aplicável.
- [ ] Exames não laboratoriais ocultam campo de tipo de exame quando não aplicável.
- [ ] Ações disponíveis aparecem no detalhe da requisição.

### Testes mínimos

- [ ] Teste automatizado cria requisição com um exame.
- [ ] Teste automatizado cria requisição com múltiplos exames.
- [ ] Teste automatizado impede acesso indevido por tenant diferente.
- [ ] Teste manual confirma que itens aparecem em segunda camada.

---

## Fluxo 3 — Colheita e amostras

### Backend

- [ ] Colheita possui endpoint de listagem.
- [ ] Colheita possui endpoint de detalhe.
- [ ] Colheita possui endpoint/acção de confirmação.
- [ ] Amostra possui endpoint de listagem.
- [ ] Amostra possui endpoint de detalhe.
- [ ] Amostra mantém vínculo com paciente, requisição, item/exame e setor.
- [ ] Amostra possui identificador rastreável.
- [ ] Amostra possui estado operacional.
- [ ] Recepção de amostra possui endpoint/acção.
- [ ] Rejeição de amostra possui endpoint/acção.
- [ ] Rejeição exige motivo.
- [ ] Rejeição regista responsável e data/hora.

### Frontend

- [ ] Colheitas aparecem no frontend.
- [ ] Amostras aparecem no frontend.
- [ ] Recepção de amostras aparece no frontend.
- [ ] Rejeições aparecem no frontend.
- [ ] Amostra mostra estado, origem, paciente, requisição e exame.
- [ ] Ação de confirmar colheita aparece para perfil autorizado.
- [ ] Ação de receber amostra aparece para perfil autorizado.
- [ ] Ação de rejeitar amostra aparece para perfil autorizado.
- [ ] Motivo de rejeição é obrigatório no formulário.

### Testes mínimos

- [ ] Teste automatizado confirma colheita.
- [ ] Teste automatizado recebe amostra.
- [ ] Teste automatizado rejeita amostra com motivo.
- [ ] Teste automatizado bloqueia rejeição sem motivo.
- [ ] Teste manual valida visibilidade das ações por perfil.

---

## Fluxo 4 — Listas de trabalho

### Backend

- [ ] Lista de trabalho possui endpoint de listagem.
- [ ] Lista de trabalho permite filtro por setor.
- [ ] Lista de trabalho permite filtro por estado.
- [ ] Lista de trabalho permite filtro por prioridade.
- [ ] Lista de trabalho permite filtro por data.
- [ ] Lista de trabalho mostra exames pendentes por setor/equipamento quando aplicável.

### Frontend

- [ ] Listas de trabalho aparecem no menu laboratorial.
- [ ] Filtros principais aparecem na interface.
- [ ] Técnico consegue abrir item de trabalho.
- [ ] Técnico consegue iniciar/continuar lançamento de resultado.
- [ ] Estados vazios são claros.

### Testes mínimos

- [ ] Teste automatizado lista trabalho pendente.
- [ ] Teste automatizado filtra por setor.
- [ ] Teste manual confirma navegação até resultado.

---

## Fluxo 5 — Resultados

### Backend

- [ ] Resultado possui endpoint de listagem.
- [ ] Resultado possui endpoint de detalhe.
- [ ] Resultado possui endpoint de criação/lançamento.
- [ ] Resultado possui endpoint de edição antes da validação quando permitido.
- [ ] Resultado bloqueia edição indevida após validação.
- [ ] Resultado suporta campos estruturados por exame.
- [ ] Resultado mantém vínculo com amostra, requisição, exame e paciente.
- [ ] Resultado regista responsável técnico.
- [ ] Resultado regista data/hora de lançamento.

### Frontend

- [ ] Resultados aparecem no frontend.
- [ ] Resultado pode ser lançado a partir da lista de trabalho ou detalhe da requisição.
- [ ] Campos do exame aparecem corretamente.
- [ ] Resultado mostra referência/intervalo quando aplicável.
- [ ] Resultado mostra unidade quando aplicável.
- [ ] Erros de validação aparecem de forma compreensível.

### Testes mínimos

- [ ] Teste automatizado lança resultado simples.
- [ ] Teste automatizado impede resultado sem vínculo obrigatório.
- [ ] Teste automatizado verifica bloqueio após validação.
- [ ] Teste manual lança resultado pela interface.

---

## Fluxo 6 — Validação

### Backend

- [ ] Validação possui endpoint/acção controlada.
- [ ] Apenas perfil autorizado valida resultado.
- [ ] Validação regista validador e data/hora.
- [ ] Validação altera estado do resultado/requisição.
- [ ] Validação é auditável.
- [ ] Resultado validado não pode ser alterado por perfil não autorizado.

### Frontend

- [ ] Botão/acção de validar aparece apenas para perfil autorizado.
- [ ] Validação aparece no detalhe do resultado.
- [ ] Estado validado fica visível.
- [ ] Mensagem de confirmação aparece antes da validação quando aplicável.

### Testes mínimos

- [ ] Teste automatizado valida resultado com perfil autorizado.
- [ ] Teste automatizado bloqueia validação por perfil não autorizado.
- [ ] Teste manual confirma visibilidade da ação por perfil.

---

## Fluxo 7 — Laudos

### Backend

- [ ] Laudo possui endpoint de listagem.
- [ ] Laudo possui endpoint de detalhe.
- [ ] Laudo possui endpoint/acção de geração.
- [ ] Laudo possui endpoint/acção de emissão.
- [ ] Laudo mantém vínculo com paciente, requisição e resultados.
- [ ] Laudo possui estado: rascunho, emitido, cancelado/retificado quando aplicável.
- [ ] Geração de PDF possui tratamento de erro.
- [ ] Falha em Celery/broker não deve gerar 500 não controlado.
- [ ] PDF possui identificação institucional e dados essenciais.

### Frontend

- [ ] Laudos aparecem no frontend.
- [ ] Laudo pode ser aberto a partir da requisição ou resultado.
- [ ] Pré-visualização funciona.
- [ ] Impressão/exportação funciona.
- [ ] Erro na geração aparece com mensagem controlada.

### Testes mínimos

- [ ] Teste automatizado gera laudo com resultado validado.
- [ ] Teste automatizado bloqueia laudo sem resultado validado quando essa for a regra.
- [ ] Teste automatizado cobre erro controlado de PDF.
- [ ] Teste manual imprime/exporta laudo.

---

## Fluxo 8 — Microbiologia, antibiograma, biologia molecular e baciloscopia

Estes subfluxos podem entrar como beta interna se o fluxo laboratorial básico estiver estável.

### Microbiologia

- [ ] Culturas isoladas aparecem no frontend.
- [ ] Cultura fica vinculada à amostra.
- [ ] Isolado possui identificação clara.
- [ ] Resultado microbiológico segue fluxo de validação.

### Antibiograma

- [ ] Antibiograma aparece no frontend.
- [ ] Antibiograma fica vinculado à cultura/isolado.
- [ ] Sensibilidade/resistência é registada de forma estruturada.
- [ ] Resultado validado aparece no laudo.

### Biologia molecular

- [ ] Exames moleculares aparecem no frontend.
- [ ] Resultado molecular possui campos próprios.
- [ ] Resultado molecular segue fluxo de validação/laudo.

### Baciloscopia

- [ ] Baciloscopia aparece no frontend.
- [ ] Resultado possui classificação apropriada.
- [ ] Resultado segue validação/laudo.

---

## Qualidade laboratorial

A qualidade laboratorial deve entrar como prioridade alta após estabilizar o fluxo principal.

- [ ] Não conformidades aparecem no frontend.
- [ ] Ações corretivas aparecem no frontend.
- [ ] Controlo interno da qualidade aparece no frontend.
- [ ] Controlo externo da qualidade aparece no frontend.
- [ ] Auditorias internas aparecem no frontend.
- [ ] Registos possuem responsável, estado e prazo.
- [ ] Acções vencidas aparecem em dashboard/alerta.

---

## Biossegurança laboratorial

- [ ] Incidentes de biossegurança aparecem no frontend.
- [ ] Exposições ocupacionais aparecem no frontend com acesso controlado.
- [ ] EPIs/conformidade aparecem no frontend quando aplicável.
- [ ] Incidente possui classificação, descrição, responsável e estado.
- [ ] Dados sensíveis possuem controlo de acesso mais restrito.

---

## Segurança e permissões

- [ ] Recepção não valida resultado.
- [ ] Técnico não emite laudo se essa função for reservada ao supervisor.
- [ ] Médico visualiza apenas resultados/laudos permitidos.
- [ ] Utilizador de outro tenant não visualiza dados laboratoriais alheios.
- [ ] Ações críticas exigem autenticação.
- [ ] Ações críticas são registadas em auditoria.
- [ ] Frontend oculta ações não permitidas.
- [ ] Backend bloqueia ações não permitidas mesmo se chamadas manualmente.

---

## Observabilidade e operação

- [ ] Erros de API são logados com contexto suficiente.
- [ ] Erros de PDF são logados sem expor dados sensíveis.
- [ ] Health checks não dependem de fluxo laboratorial específico.
- [ ] Falhas de fila/Celery são tratadas de forma controlada.
- [ ] Fluxos críticos possuem mensagens de erro compreensíveis.
- [ ] Ações críticas possuem timestamps.

---

## Dados de demonstração

Para beta, deve existir massa mínima de dados:

- [ ] 2 setores laboratoriais.
- [ ] 10 exames laboratoriais básicos.
- [ ] 2 painéis de exames.
- [ ] 5 pacientes demo.
- [ ] 5 requisições demo.
- [ ] 5 amostras demo em estados diferentes.
- [ ] 3 resultados demo.
- [ ] 2 laudos demo.
- [ ] 1 rejeição de amostra demo.
- [ ] 1 não conformidade demo.

---

## Critério para marcar como beta-ready

O laboratório clínico só pode ser marcado como `beta-ready` quando:

- [ ] Requisição com múltiplos exames funciona no frontend.
- [ ] Itens da requisição aparecem apenas em segunda camada.
- [ ] Colheita, amostra e recepção de amostra estão expostas no frontend.
- [ ] Resultado, validação e laudo estão expostos no frontend.
- [ ] Perfis e permissões impedem acções indevidas.
- [ ] Tenant isolation foi testado.
- [ ] PDF de laudo/fatura não quebra com erro 500 não tratado.
- [ ] Fluxo paciente → requisição → amostra → resultado → validação → laudo foi testado manualmente.
- [ ] Pelo menos os testes automatizados mínimos dos fluxos críticos foram implementados.
- [ ] `FRONTEND_API_EXPOSURE_MATRIX.md` foi actualizado com o estado real após testagem.

---

## Próxima evolução recomendada

Após cumprir este readiness, criar documentos equivalentes para:

- `readiness/billing.md`;
- `readiness/payments.md`;
- `readiness/pharmacy.md`;
- `readiness/identity_access.md`;
- `readiness/quality_biosafety.md`.
