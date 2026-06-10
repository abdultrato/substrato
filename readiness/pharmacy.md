# Readiness — Farmácia

Checklist de prontidão do módulo de Farmácia para a beta do Substrato.

Este documento define os critérios mínimos para produtos, categorias, lotes, movimentos de estoque, vendas e integração com faturamento funcionarem de forma segura, rastreável e utilizável no frontend.

---

## Objectivo do módulo

A Farmácia deve suportar o fluxo operacional básico:

```text
Categoria → Produto → Lote → Movimento de Estoque → Venda/Dispensa → Fatura → Pagamento/Recibo
```

O módulo só deve ser considerado pronto quando conseguir controlar produtos e lotes sem quebrar o frontend, mantendo rastreabilidade de estoque e vínculo financeiro quando aplicável.

---

## Status geral

| Área | Status inicial | Prioridade |
| --- | --- | --- |
| Categorias | validar | média |
| Produtos | validar | alta |
| Lotes | corrigir | crítica |
| Movimentos de estoque | validar | alta |
| Vendas | validar | alta |
| Itens de venda | validar | alta |
| Integração com faturamento | validar | alta |
| Baixa de estoque | validar | crítica |
| Auditoria de estoque | parcial | alta |
| Alertas de validade/estoque | parcial | média |

---

## Perfis envolvidos

| Perfil | Permissões esperadas |
| --- | --- |
| Farmacêutico | Gerir produtos, lotes, movimentos, vendas e dispensas. |
| Técnico de farmácia | Consultar produtos, registar vendas/dispensas conforme permissão. |
| Caixa | Receber pagamento de venda/fatura quando aplicável. |
| Supervisor | Autorizar ajustes, anulações e movimentos sensíveis. |
| Administrador | Configurar categorias, permissões e parâmetros. |
| Auditor/Financeiro | Consultar movimentos, vendas e vínculo com faturamento. |

---

## Fluxo 1 — Categorias de produtos

### Backend

- [ ] Categoria possui endpoint de listagem.
- [ ] Categoria possui endpoint de detalhe.
- [ ] Categoria possui endpoint de criação.
- [ ] Categoria possui endpoint de edição.
- [ ] Categoria suporta hierarquia quando aplicável.
- [ ] Categoria possui estado activo/inactivo quando aplicável.
- [ ] Endpoint aparece no OpenAPI/schema.
- [ ] RBAC aplicado.
- [ ] Tenant isolation validado quando aplicável.

### Frontend

- [ ] Categorias aparecem no menu/local correcto.
- [ ] Listagem carrega sem erro.
- [ ] Detalhe abre correctamente.
- [ ] Criar/editar funciona para perfil autorizado.
- [ ] Estados de loading, vazio e erro são tratados.

### Testes mínimos

- [ ] Teste automatizado cria categoria.
- [ ] Teste automatizado lista categorias por tenant.
- [ ] Teste manual cria e edita categoria pela interface.

---

## Fluxo 2 — Produtos

### Backend

- [ ] Produto possui endpoint de listagem.
- [ ] Produto possui endpoint de detalhe.
- [ ] Produto possui endpoint de criação.
- [ ] Produto possui endpoint de edição.
- [ ] Produto possui nome, código, categoria e unidade quando aplicável.
- [ ] Produto possui estado activo/inactivo.
- [ ] Produto suporta preço de venda quando aplicável.
- [ ] Produto suporta estoque mínimo quando aplicável.
- [ ] Produto aparece no OpenAPI/schema.
- [ ] RBAC aplicado.

### Frontend

- [ ] Produtos aparecem no frontend.
- [ ] Listagem possui busca por nome/código.
- [ ] Listagem possui filtros por categoria e estado quando aplicável.
- [ ] Detalhe mostra lotes vinculados.
- [ ] Detalhe mostra saldo ou resumo de estoque quando disponível.
- [ ] Criar/editar funciona para perfil autorizado.
- [ ] Produto inactivo não deve aparecer como vendável/dispensável.

### Testes mínimos

- [ ] Teste automatizado cria produto.
- [ ] Teste automatizado filtra produto por nome/código.
- [ ] Teste automatizado bloqueia venda de produto inactivo se essa for a regra.
- [ ] Teste manual valida busca e detalhe no frontend.

---

## Fluxo 3 — Lotes

### Contexto crítico

Foi reportado erro no frontend em **Farmácia → Lotes**. Este fluxo deve ser priorizado antes de marcar Farmácia como pronta.

### Backend

- [ ] Lote possui endpoint de listagem.
- [ ] Lote possui endpoint de detalhe.
- [ ] Lote possui endpoint de criação.
- [ ] Lote possui endpoint de edição quando permitido.
- [ ] Lote fica vinculado a produto obrigatório.
- [ ] Lote possui número/código identificável.
- [ ] Lote possui validade quando aplicável.
- [ ] Lote possui quantidade/saldo ou vínculo com movimentos de estoque.
- [ ] Lote possui estado: activo, esgotado, expirado, bloqueado quando aplicável.
- [ ] Endpoint aparece no OpenAPI/schema.
- [ ] Serializers retornam campos esperados pelo frontend.
- [ ] Endpoint não retorna erro 500 com dados normais.

### Frontend

- [ ] Página de lotes carrega sem erro.
- [ ] Listagem mostra produto, número do lote, validade, saldo e estado quando disponíveis.
- [ ] Clique no lote abre detalhe.
- [ ] Criar lote funciona para perfil autorizado.
- [ ] Editar lote funciona apenas quando permitido.
- [ ] Filtro por produto funciona.
- [ ] Filtro por validade/estado funciona quando disponível.
- [ ] Lote expirado aparece sinalizado.
- [ ] Lote bloqueado não deve ser vendido/dispensado.
- [ ] Erros aparecem com mensagem controlada, não tela quebrada.

### Testes mínimos

- [ ] Teste automatizado lista lotes.
- [ ] Teste automatizado cria lote vinculado a produto.
- [ ] Teste automatizado bloqueia lote sem produto.
- [ ] Teste automatizado filtra lote por produto.
- [ ] Teste manual abre Farmácia → Lotes sem erro.
- [ ] Teste manual cria lote e confirma aparição na lista.

---

## Fluxo 4 — Movimentos de estoque

### Backend

- [ ] Movimento possui endpoint de listagem.
- [ ] Movimento possui endpoint de detalhe.
- [ ] Movimento possui endpoint de criação.
- [ ] Movimento fica vinculado a produto.
- [ ] Movimento fica vinculado a lote quando aplicável.
- [ ] Movimento possui tipo: entrada, saída, ajuste, transferência, devolução, perda.
- [ ] Movimento possui quantidade.
- [ ] Movimento possui responsável e data/hora.
- [ ] Movimento actualiza saldo conforme regra definida.
- [ ] Movimento negativo indevido é bloqueado.
- [ ] Ajustes sensíveis exigem permissão elevada.

### Frontend

- [ ] Movimentos aparecem no frontend.
- [ ] Listagem possui filtros por produto, lote, tipo e data.
- [ ] Criar movimento funciona para perfil autorizado.
- [ ] Detalhe mostra origem, responsável e impacto no estoque.
- [ ] Ajustes aparecem com destaque/auditoria.
- [ ] Erros de estoque insuficiente aparecem claramente.

### Testes mínimos

- [ ] Teste automatizado cria entrada de estoque.
- [ ] Teste automatizado cria saída de estoque.
- [ ] Teste automatizado bloqueia saída acima do saldo se essa for a regra.
- [ ] Teste automatizado exige permissão para ajuste.
- [ ] Teste manual confirma saldo após movimento.

---

## Fluxo 5 — Venda/dispensa

### Backend

- [ ] Venda possui endpoint de listagem.
- [ ] Venda possui endpoint de detalhe.
- [ ] Venda possui endpoint de criação.
- [ ] Venda possui paciente/cliente quando aplicável.
- [ ] Venda possui itens vinculados.
- [ ] Item de venda fica vinculado a produto.
- [ ] Item de venda fica vinculado a lote quando rastreio for obrigatório.
- [ ] Venda calcula total corretamente.
- [ ] Venda baixa estoque quando confirmada conforme regra definida.
- [ ] Venda cancelada/anulada reverte ou compensa estoque conforme regra definida.
- [ ] Venda pode gerar fatura quando aplicável.

### Frontend

- [ ] Vendas aparecem no frontend.
- [ ] Criar venda permite pesquisar produto.
- [ ] Criar venda permite escolher lote quando aplicável.
- [ ] Criar venda mostra preço, quantidade e total.
- [ ] Venda mostra fatura vinculada quando existir.
- [ ] Venda mostra pagamento/estado financeiro quando aplicável.
- [ ] Cancelamento exige confirmação e permissão quando disponível.

### Testes mínimos

- [ ] Teste automatizado cria venda com um produto.
- [ ] Teste automatizado cria venda com lote.
- [ ] Teste automatizado baixa estoque ao confirmar venda.
- [ ] Teste automatizado bloqueia venda sem saldo.
- [ ] Teste automatizado gera fatura a partir da venda quando aplicável.
- [ ] Teste manual executa produto → lote → venda → fatura.

---

## Fluxo 6 — Integração com faturamento e pagamentos

### Backend

- [ ] Venda pode gerar fatura sem duplicar itens.
- [ ] Item de venda vira item de fatura com descrição, quantidade e valor correctos.
- [ ] Fatura mantém referência à venda ou origem farmácia.
- [ ] Pagamento pode liquidar fatura de farmácia.
- [ ] Recibo fica vinculado ao pagamento/fatura.
- [ ] Cancelamento de venda possui regra financeira clara.

### Frontend

- [ ] Detalhe da venda mostra fatura vinculada.
- [ ] Detalhe da fatura mostra origem farmácia.
- [ ] Pagamento pode ser feito a partir da fatura.
- [ ] Recibo pode ser visualizado/baixado quando aplicável.
- [ ] Mensagem clara aparece quando fatura já existe.

### Testes mínimos

- [ ] Teste automatizado garante idempotência ao gerar fatura de venda.
- [ ] Teste automatizado valida total da fatura gerada pela venda.
- [ ] Teste manual executa venda → fatura → pagamento → recibo.

---

## Fluxo 7 — Alertas e controlo operacional

### Backend

- [ ] Produtos abaixo do estoque mínimo podem ser identificados.
- [ ] Lotes próximos da validade podem ser identificados.
- [ ] Lotes expirados podem ser identificados.
- [ ] Lotes bloqueados não entram em venda/dispensa.
- [ ] Alertas aparecem em endpoint ou dashboard quando aplicável.

### Frontend

- [ ] Produtos com baixo estoque aparecem sinalizados.
- [ ] Lotes próximos da validade aparecem sinalizados.
- [ ] Lotes expirados aparecem sinalizados.
- [ ] Lotes bloqueados aparecem sinalizados.
- [ ] Dashboard/resumo mostra alertas básicos quando disponível.

### Testes mínimos

- [ ] Teste automatizado identifica lote expirado.
- [ ] Teste automatizado identifica baixo estoque.
- [ ] Teste manual confirma sinalização visual no frontend.

---

## Segurança e permissões

- [ ] Técnico não faz ajuste sensível sem permissão.
- [ ] Caixa não altera estoque diretamente.
- [ ] Farmacêutico não acessa dados de outro tenant.
- [ ] Supervisor autoriza ajuste/anulação quando regra exigir.
- [ ] Frontend oculta ações não permitidas.
- [ ] Backend bloqueia ações não permitidas mesmo se chamadas manualmente.
- [ ] Movimentos de estoque são auditáveis.
- [ ] Vendas e cancelamentos são auditáveis.

---

## Estados recomendados

### Produto

| Estado | Regra |
| --- | --- |
| `activo` | Pode ser utilizado em venda/dispensa. |
| `inactivo` | Não deve aparecer como vendável. |
| `bloqueado` | Uso operacional bloqueado até liberação. |

### Lote

| Estado | Regra |
| --- | --- |
| `activo` | Pode ser usado se tiver saldo e validade adequada. |
| `esgotado` | Não deve ser selecionável para venda. |
| `expirado` | Não deve ser vendido/dispensado. |
| `bloqueado` | Não deve ser usado operacionalmente. |
| `quarentena` | Deve exigir permissão/fluxo especial. |

### Movimento

| Tipo | Regra |
| --- | --- |
| `entrada` | Aumenta estoque. |
| `saída` | Reduz estoque. |
| `ajuste` | Exige justificativa e permissão. |
| `perda` | Exige motivo e auditoria. |
| `devolução` | Deve seguir regra definida de estoque/financeiro. |
| `transferência` | Deve preservar origem e destino. |

### Venda

| Estado | Regra |
| --- | --- |
| `rascunho` | Pode ser editada. |
| `confirmada` | Deve gerar baixa de estoque conforme regra. |
| `faturada` | Possui fatura vinculada. |
| `paga` | Financeiramente liquidada. |
| `cancelada` | Deve preservar histórico e regra de reversão. |

---

## Observabilidade e operação

- [ ] Erros de estoque são logados com contexto técnico.
- [ ] Erros de lote no frontend não quebram a navegação geral.
- [ ] Falhas de faturamento a partir de venda são tratadas com mensagem clara.
- [ ] Movimentos críticos possuem timestamp e utilizador responsável.
- [ ] Ajustes possuem motivo obrigatório.
- [ ] Cancelamentos possuem motivo obrigatório quando aplicável.
- [ ] Relatórios/exportações não bloqueiam a API principal.

---

## Dados de demonstração

Para beta, deve existir massa mínima de dados:

- [ ] 3 categorias de produtos.
- [ ] 10 produtos demo.
- [ ] 10 lotes demo.
- [ ] 2 lotes próximos da validade.
- [ ] 1 lote expirado.
- [ ] 1 lote bloqueado.
- [ ] 5 movimentos de estoque.
- [ ] 3 vendas demo.
- [ ] 1 venda faturada.
- [ ] 1 venda paga.

---

## Critério para marcar como beta-ready

Farmácia só pode ser marcada como `beta-ready` quando:

- [ ] Produtos carregam no frontend.
- [ ] Lotes carregam no frontend sem erro.
- [ ] Lote pode ser criado e vinculado a produto.
- [ ] Movimento de estoque actualiza saldo conforme regra.
- [ ] Venda baixa estoque conforme regra.
- [ ] Venda pode gerar fatura quando aplicável.
- [ ] Pagamento/recibo funciona para fatura de farmácia.
- [ ] Lote expirado/bloqueado não pode ser vendido se essa for a regra.
- [ ] Tenant isolation foi testado.
- [ ] RBAC de estoque foi testado.
- [ ] Fluxo produto → lote → movimento → venda → fatura → pagamento foi testado manualmente.
- [ ] `FRONTEND_API_EXPOSURE_MATRIX.md` foi actualizado com o estado real após testagem.

---

## Próxima evolução recomendada

Após cumprir este readiness, criar ou consolidar:

- `readiness/identity_access.md`;
- `readiness/quality_biosafety.md`;
- checklist de inventário e contagem cíclica;
- matriz de integração Farmácia ↔ Faturamento;
- testes automatizados de estoque e venda.
