# Escopo da Beta do Substrato

Este documento define o escopo mínimo da beta do Substrato, separando o que deve ficar estável para teste real, o que pode ficar em modo parcial e o que deve permanecer experimental até cumprir critérios técnicos mínimos.

O objectivo é evitar crescimento descontrolado do produto antes da estabilização dos fluxos essenciais.

---

## Princípio da beta

A beta do Substrato deve provar que a plataforma consegue operar um fluxo institucional real com segurança, rastreabilidade, tenant isolation, RBAC, auditoria, faturamento e experiência frontend minimamente coerente.

A beta não precisa entregar todos os módulos imaginados. Ela precisa entregar um núcleo confiável, testável e demonstrável.

---

## Núcleo obrigatório da beta

Os módulos abaixo compõem o núcleo mínimo para a beta.

| Área | Entra na beta? | Prioridade | Motivo |
| --- | --- | --- | --- |
| Identidade e acesso | sim | crítica | Base para login, sessão, utilizadores, perfis e permissões. |
| Tenants/Inquilinos | sim | crítica | Base para isolamento de dados e operação multi-organização. |
| Auditoria | sim | crítica | Necessária para rastreabilidade clínica, financeira e administrativa. |
| Pacientes | sim | crítica | Entidade central dos fluxos de saúde. |
| Recepção | sim | crítica | Entrada operacional: paciente, atendimento, requisição e encaminhamento. |
| Consultas médicas | sim | alta | Fluxo clínico primário e ligação com paciente/prontuário. |
| Laboratório clínico | sim | crítica | Fluxo essencial: requisição, amostra, resultado, validação e laudo. |
| Faturamento | sim | crítica | Conversão de serviços em faturas e itens faturáveis. |
| Pagamentos | sim | crítica | Fecho financeiro de faturas e recibos. |
| Farmácia básica | sim | alta | Produtos, lotes e movimentos essenciais. |
| Dashboard operacional | sim | média | Indicadores mínimos para demonstração e controlo. |
| Notificações básicas | sim | média | Registo e envio controlado quando aplicável. |

---

## Fluxos obrigatórios da beta

### 1. Autenticação e sessão

- [ ] Utilizador consegue iniciar sessão.
- [ ] Sessão permanece activa com actividade real na página.
- [ ] Sessão expira apenas após 30 minutos de inactividade real.
- [ ] Perfis diferentes visualizam apenas recursos e acções permitidas.
- [ ] Logout funciona de forma limpa.

### 2. Paciente e recepção

- [ ] Recepção cadastra paciente.
- [ ] Recepção lista pacientes.
- [ ] Recepção abre detalhe do paciente.
- [ ] Interface de pacientes segue padrão visual das listas de consultas.
- [ ] Recepção consegue iniciar requisição de exames.

### 3. Requisição laboratorial

- [ ] Recepção cria requisição para paciente.
- [ ] Campo de exame permite digitar e filtrar exames existentes.
- [ ] Exames aparecem em ordem alfabética.
- [ ] Clicar num exame adiciona à lista da requisição.
- [ ] É possível adicionar múltiplos exames.
- [ ] É possível informar médico solicitante quando a requisição é feita pela recepção.
- [ ] Itens da requisição aparecem dentro do detalhe da requisição, não como lista isolada.

### 4. Amostra e colheita

- [ ] Colheita aparece no frontend.
- [ ] Amostra aparece no frontend.
- [ ] Recepção de amostra aparece no frontend.
- [ ] Rejeição de amostra aparece no frontend.
- [ ] Amostra mantém vínculo com paciente, requisição e exame.
- [ ] Estados da amostra são visíveis e auditáveis.

### 5. Resultado, validação e laudo

- [ ] Resultado pode ser lançado.
- [ ] Resultado pode ser visualizado.
- [ ] Resultado pode ser validado por perfil autorizado.
- [ ] Laudo pode ser gerado/emitido.
- [ ] Laudo pode ser pré-visualizado/imprimido/exportado.
- [ ] Erros de PDF não retornam 500 sem mensagem controlada.

### 6. Faturamento e pagamento

- [ ] Requisição/serviço gera fatura quando aplicável.
- [ ] Fatura lista itens corretamente.
- [ ] PDF de fatura é gerado sem erro interno.
- [ ] Pagamento pode ser registado.
- [ ] Recibo fica vinculado ao pagamento/fatura.

### 7. Farmácia básica

- [ ] Produtos aparecem no frontend.
- [ ] Lotes aparecem no frontend sem erro.
- [ ] Movimentos de estoque aparecem no frontend.
- [ ] Produto, lote e movimento mantêm vínculo correto.

---

## Áreas permitidas como parciais na beta

Estas áreas podem existir na beta desde que não bloqueiem os fluxos críticos.

| Área | Status permitido | Condição |
| --- | --- | --- |
| Educação | parcial | Não deve quebrar build, login, dashboard ou navegação principal. |
| WMS/Armazém | parcial | Fluxos avançados podem ficar ocultos se não estiverem estáveis. |
| RH | parcial | Deve manter apenas listagens e cadastros estáveis. |
| Contabilidade | parcial | Não deve bloquear faturamento e pagamentos. |
| Seguradoras | parcial | Pode ficar atrás de feature flag. |
| Notificações avançadas | parcial | Envio externo pode ficar desativado por ambiente. |
| IA operacional | parcial | Deve ser auditável e não executar acções destrutivas sem confirmação. |
| Equipamentos hospitalares | parcial | Pode ficar como cadastro e manutenção básica. |
| Integração de equipamentos laboratoriais | parcial | Pode ficar em modo técnico/experimental até validação por aparelho real. |

---

## Áreas experimentais fora do núcleo beta

Estas áreas não devem bloquear a beta inicial.

| Área | Motivo |
| --- | --- |
| Kafka analytics | Arquitectura avançada; não essencial para beta funcional. |
| RabbitMQ como backbone obrigatório | Pode permanecer opcional até necessidade real. |
| OpenTelemetry completo | Importante, mas pode evoluir após estabilização dos fluxos críticos. |
| Telemedicina avançada | Depende de requisitos clínicos, consentimento e segurança adicional. |
| Biologia molecular avançada | Deve entrar após laboratório básico estabilizado. |
| Microbiologia avançada | Culturas e antibiograma podem iniciar como beta interna. |
| Veterinária | Domínio separado; não deve competir com núcleo clínico humano. |
| Odontologia avançada | Pode evoluir depois do núcleo paciente/consulta/faturamento. |
| Fisioterapia/terapias avançadas | Pode ficar como módulo parcial. |
| Transporte/logística avançada | Não deve bloquear saúde/laboratório/faturamento. |

---

## Bloqueadores da beta

A beta não deve ser considerada pronta se qualquer ponto abaixo estiver presente.

| Bloqueador | Severidade |
| --- | --- |
| Login instável ou sessão a expirar durante actividade real | crítica |
| Tenant isolation não validado | crítica |
| RBAC permite acção indevida em domínio clínico/financeiro | crítica |
| PDF de fatura/laudo retorna erro 500 sem tratamento | crítica |
| Requisição laboratorial não permite múltiplos exames | crítica |
| Itens de pedido aparecem como recurso isolado no frontend | alta |
| Amostras/colheitas não aparecem no frontend | crítica |
| Resultados/laudos não aparecem no frontend | crítica |
| Lotes de farmácia quebram a página | alta |
| Migrações pendentes ou drift de modelos | crítica |
| Build frontend falha | crítica |
| CI falha em migrations, lint ou testes essenciais | crítica |

---

## Critérios mínimos de prontidão técnica

Para um módulo entrar como `beta-ready`, deve cumprir:

- [ ] Models e migrations consistentes.
- [ ] ViewSets registrados em `api/v1/routing/routes.py` quando aplicável.
- [ ] Endpoint aparece no OpenAPI/schema.
- [ ] Serializers cobrem listagem, detalhe, criação e edição quando aplicável.
- [ ] Frontend possui listagem.
- [ ] Frontend possui detalhe quando aplicável.
- [ ] Frontend possui criação/edição quando aplicável.
- [ ] Estados de loading, vazio e erro tratados.
- [ ] RBAC aplicado no backend.
- [ ] UI respeita permissões do perfil actual.
- [ ] Tenant isolation validado.
- [ ] Auditoria ou histórico existe para acções críticas.
- [ ] Pelo menos um teste automatizado cobre fluxo principal.
- [ ] Testagem manual registada na matriz `FRONTEND_API_EXPOSURE_MATRIX.md`.

---

## Política de feature flags

Funcionalidades incompletas ou experimentais devem ficar protegidas por feature flag, configuração de ambiente ou menu oculto.

Critérios para esconder funcionalidade:

- fluxo sem permissão validada;
- endpoint sem frontend confiável;
- frontend sem tratamento de erro;
- recurso que causa erro 500;
- domínio ainda sem testes mínimos;
- integração dependente de equipamento real ainda não validado.

---

## Ordem recomendada de estabilização

1. Autenticação, sessão, utilizadores e permissões.
2. Tenants e isolamento de dados.
3. Pacientes e recepção.
4. Requisição laboratorial.
5. Colheitas, amostras e recepção de amostras.
6. Resultados, validação e laudos.
7. Faturamento e PDF de fatura.
8. Pagamentos e recibos.
9. Farmácia básica, produtos, lotes e movimentos.
10. Dashboard operacional.
11. Qualidade laboratorial.
12. Biossegurança.

---

## Relação com outros documentos

Este documento deve ser lido em conjunto com:

- `SUBSTRATO.md` — visão consolidada do projecto.
- `FRONTEND_API_EXPOSURE_MATRIX.md` — matriz de exposição API → Frontend.
- `.github/workflows/ci.yml` — gates automatizados de qualidade.
- documentação futura de readiness por domínio.

---

## Decisão de produto

A beta deve privilegiar confiabilidade sobre quantidade de módulos.

A pergunta principal antes de marcar uma funcionalidade como pronta deve ser:

> Esta funcionalidade consegue ser usada por uma equipa real, com dados reais, sem quebrar segurança, rastreabilidade, faturamento ou experiência básica do utilizador?

Se a resposta for não, a funcionalidade deve ficar parcial, experimental ou escondida até cumprir os critérios mínimos.
