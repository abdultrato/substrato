# Readiness — Identidade e Acesso

Checklist de prontidão dos módulos de Identidade, Autenticação, Autorização, Sessão, RBAC e Tenant Isolation para a beta do Substrato.

Este documento define os critérios mínimos para que o acesso ao sistema seja seguro, previsível, auditável e adequado a uma plataforma multi-tenant.

---

## Objectivo do módulo

Identidade e Acesso devem garantir que cada utilizador entra no sistema com o perfil correcto, no tenant correcto, com permissões correctas e com sessão estável.

Fluxo base:

```text
Tenant → Utilizador → Perfil/Função → Permissões → Sessão → Acesso aos módulos → Auditoria
```

Este módulo é bloqueador da beta. Nenhum fluxo clínico, financeiro ou administrativo deve ser considerado pronto se identidade, sessão, RBAC e tenant isolation não estiverem validados.

---

## Status geral

| Área | Status inicial | Prioridade |
| --- | --- | --- |
| Login | corrigir | crítica |
| Sessão de 30 minutos por inactividade real | corrigir | crítica |
| Logout | validar | crítica |
| Refresh/renovação de sessão | validar | crítica |
| Utilizadores | validar | crítica |
| Perfis profissionais | validar | alta |
| RBAC | validar | crítica |
| Tenant isolation | validar | crítica |
| Auditoria de acesso | validar | alta |
| Recuperação de palavra-passe | validar | média |
| Exposição de permissões no frontend | validar | crítica |

---

## Perfis mínimos da beta

| Perfil | Acesso esperado |
| --- | --- |
| Administrador | Configuração global do tenant, utilizadores, permissões e módulos. |
| Recepção | Pacientes, consultas/requisições, faturas básicas e acompanhamento de pagamento. |
| Técnico de laboratório | Colheitas, amostras, listas de trabalho e lançamento de resultados. |
| Supervisor laboratorial | Validação de resultados, laudos, rejeições e qualidade laboratorial. |
| Médico/Clínico | Consultas, prontuário e visualização de resultados/laudos autorizados. |
| Farmácia | Produtos, lotes, estoque, vendas/dispensas conforme permissão. |
| Caixa/Financeiro | Faturas, pagamentos, recibos e reconciliação conforme permissão. |
| Gestor/Administrador institucional | Indicadores, relatórios e supervisão operacional. |

---

## Fluxo 1 — Login

### Backend

- [ ] Endpoint de login existe e responde.
- [ ] Login exige credenciais válidas.
- [ ] Login retorna tokens/sessão de forma consistente.
- [ ] Login identifica tenant do utilizador.
- [ ] Login bloqueia utilizador inactivo.
- [ ] Login bloqueia tenant inactivo/suspenso quando aplicável.
- [ ] Tentativas inválidas são controladas.
- [ ] Erros não expõem informação sensível.
- [ ] Evento de login bem-sucedido é auditável.
- [ ] Evento de login falhado é auditável quando aplicável.

### Frontend

- [ ] Página de login carrega sem erro.
- [ ] Login com credenciais válidas redireciona para área correcta.
- [ ] Login com credenciais inválidas mostra mensagem clara.
- [ ] Login não entra em loop de redirecionamento.
- [ ] Estado de loading aparece durante autenticação.
- [ ] Erro de rede aparece com mensagem controlada.

### Testes mínimos

- [ ] Teste automatizado faz login com utilizador válido.
- [ ] Teste automatizado bloqueia login inválido.
- [ ] Teste automatizado bloqueia utilizador inactivo.
- [ ] Teste manual confirma fluxo completo de login.

---

## Fluxo 2 — Sessão e inactividade

### Regra principal

A sessão não deve terminar enquanto houver actividade real na página. A expiração deve ocorrer apenas após **30 minutos de inactividade real**.

### Backend

- [ ] Tempo de expiração da sessão/token está configurado de forma clara.
- [ ] Renovação/refresh funciona antes da expiração quando aplicável.
- [ ] Sessão expirada é rejeitada com resposta controlada.
- [ ] Actividade real pode manter sessão activa conforme regra definida.
- [ ] Backend não aceita token/sessão inválida.
- [ ] Logout invalida sessão/token quando aplicável.

### Frontend

- [ ] Actividade real do utilizador mantém sessão activa.
- [ ] Inactividade real por 30 minutos expira sessão.
- [ ] Expiração mostra mensagem clara.
- [ ] Expiração redireciona para login sem quebrar a página.
- [ ] Renovação de sessão não causa múltiplas chamadas desnecessárias.
- [ ] Renovação de sessão não causa loop infinito.
- [ ] Actividade em formulários, cliques, navegação e chamadas úteis conta como actividade.

### Testes mínimos

- [ ] Teste manual mantém página activa e confirma que sessão não expira antes de 30 minutos de inactividade.
- [ ] Teste manual deixa página inactiva e confirma expiração após 30 minutos.
- [ ] Teste automatizado valida resposta para sessão expirada.
- [ ] Teste automatizado valida refresh/renovação quando aplicável.

---

## Fluxo 3 — Logout

### Backend

- [ ] Endpoint/acção de logout existe quando aplicável.
- [ ] Logout invalida sessão/token quando o mecanismo suportar.
- [ ] Logout é auditável quando aplicável.
- [ ] Token/sessão antiga não permite acesso após logout.

### Frontend

- [ ] Botão de logout aparece em local claro.
- [ ] Logout redireciona para login.
- [ ] Estado local do utilizador é limpo.
- [ ] Dados sensíveis não permanecem visíveis após logout.
- [ ] Voltar no navegador não exibe área protegida funcional.

### Testes mínimos

- [ ] Teste automatizado valida acesso negado após logout quando aplicável.
- [ ] Teste manual confirma logout e limpeza da interface.

---

## Fluxo 4 — Utilizadores

### Backend

- [ ] Utilizador possui endpoint de listagem para perfis autorizados.
- [ ] Utilizador possui endpoint de detalhe.
- [ ] Utilizador possui endpoint de criação para perfis autorizados.
- [ ] Utilizador possui endpoint de edição para perfis autorizados.
- [ ] Utilizador possui tenant obrigatório.
- [ ] Utilizador possui estado activo/inactivo.
- [ ] Utilizador possui perfil/função vinculada quando aplicável.
- [ ] Utilizador de um tenant não é visível a outro tenant.
- [ ] Operações sensíveis são auditáveis.

### Frontend

- [ ] Página de utilizadores aparece para administradores autorizados.
- [ ] Listagem mostra nome, email/identificador, perfil e estado.
- [ ] Detalhe abre correctamente.
- [ ] Criar utilizador funciona para perfil autorizado.
- [ ] Editar utilizador funciona para perfil autorizado.
- [ ] Activar/desactivar utilizador funciona quando permitido.
- [ ] Estados de loading, vazio e erro são tratados.

### Testes mínimos

- [ ] Teste automatizado cria utilizador em tenant.
- [ ] Teste automatizado bloqueia visibilidade entre tenants.
- [ ] Teste automatizado bloqueia criação por perfil não autorizado.
- [ ] Teste manual cria e inactiva utilizador.

---

## Fluxo 5 — Perfis, funções e permissões

### Backend

- [ ] Perfis/funções possuem estrutura clara.
- [ ] Permissões são mapeadas por domínio/recurso/acção.
- [ ] RBAC é aplicado nos ViewSets registrados.
- [ ] Permissões críticas possuem cobertura de teste.
- [ ] Alterações de perfil são auditáveis.
- [ ] Permissão negada retorna resposta controlada.
- [ ] Superuser/admin possui política explícita.

### Frontend

- [ ] Frontend recebe ou deriva permissões do utilizador autenticado.
- [ ] Menus respeitam permissões.
- [ ] Botões/acções respeitam permissões.
- [ ] Ações proibidas ficam ocultas ou desabilitadas.
- [ ] Tentativa de acesso directo a rota proibida mostra erro controlado.
- [ ] Mudança de perfil/permissão reflecte após novo login ou refresh autorizado.

### Testes mínimos

- [ ] Teste automatizado bloqueia endpoint sem permissão.
- [ ] Teste automatizado permite endpoint com permissão.
- [ ] Teste automatizado valida RBAC em laboratório.
- [ ] Teste automatizado valida RBAC em faturamento/pagamentos.
- [ ] Teste manual confirma menus diferentes por perfil.

---

## Fluxo 6 — Tenant isolation

### Regra principal

Nenhum utilizador deve visualizar, alterar, apagar, faturar, validar ou exportar dados de outro tenant, excepto por regras administrativas explicitamente definidas.

### Backend

- [ ] Todos os modelos tenant-aware possuem vínculo obrigatório ao tenant quando aplicável.
- [ ] Querysets filtram por tenant actual.
- [ ] Criação de objectos associa tenant correcto.
- [ ] Actualização impede troca indevida de tenant.
- [ ] Detalhe por ID de outro tenant retorna negado ou não encontrado.
- [ ] Exportações respeitam tenant.
- [ ] PDFs respeitam tenant.
- [ ] Dashboard respeita tenant.
- [ ] Auditoria regista tenant.

### Frontend

- [ ] Interface mostra apenas dados do tenant actual.
- [ ] Troca de tenant não mistura caches.
- [ ] React Query/cache não reaproveita dados de tenant anterior indevidamente.
- [ ] Dashboard muda dados conforme tenant.
- [ ] Exportações/PDFs não trazem dados de outro tenant.

### Testes mínimos

- [ ] Teste automatizado tenta listar dados de outro tenant e falha.
- [ ] Teste automatizado tenta abrir detalhe de outro tenant e falha.
- [ ] Teste automatizado tenta alterar objecto de outro tenant e falha.
- [ ] Teste automatizado valida dashboard por tenant.
- [ ] Teste manual usa dois tenants e confirma isolamento visual.

---

## Fluxo 7 — Recuperação de palavra-passe

### Backend

- [ ] Solicitação de recuperação possui endpoint controlado.
- [ ] Token possui tempo de vida definido.
- [ ] Token não revela existência de email/utilizador de forma insegura.
- [ ] Token usado não pode ser reutilizado.
- [ ] Nova palavra-passe obedece política mínima.
- [ ] Evento é auditável quando aplicável.

### Frontend

- [ ] Página de recuperação aparece no login.
- [ ] Pedido de recuperação mostra mensagem neutra.
- [ ] Formulário de nova palavra-passe valida campos.
- [ ] Token expirado mostra mensagem clara.
- [ ] Sucesso redireciona para login.

### Testes mínimos

- [ ] Teste automatizado solicita recuperação.
- [ ] Teste automatizado usa token válido.
- [ ] Teste automatizado bloqueia token expirado/usado.
- [ ] Teste manual executa fluxo completo.

---

## Fluxo 8 — Auditoria de acesso e actividade

### Backend

- [ ] Login é auditável.
- [ ] Logout é auditável quando aplicável.
- [ ] Falhas de login são registadas quando aplicável.
- [ ] Alterações de permissões são auditáveis.
- [ ] Alterações de utilizador são auditáveis.
- [ ] Ações críticas em laboratório, faturamento, pagamentos e farmácia são auditáveis.
- [ ] Auditoria inclui utilizador, tenant, acção, data/hora e recurso.

### Frontend

- [ ] Relatórios de actividade aparecem para perfil autorizado.
- [ ] Filtros por utilizador, acção, recurso e data funcionam quando disponíveis.
- [ ] Exportação/PDF de auditoria funciona quando disponível.
- [ ] Erros de auditoria aparecem com mensagem controlada.

### Testes mínimos

- [ ] Teste automatizado regista evento crítico.
- [ ] Teste automatizado filtra auditoria por tenant.
- [ ] Teste manual consulta relatório de actividade.

---

## Matriz mínima de permissões beta

| Recurso/Ação | Recepção | Técnico Lab | Supervisor Lab | Farmácia | Caixa | Admin |
| --- | --- | --- | --- | --- | --- | --- |
| Ver pacientes | sim | parcial | sim | não | parcial | sim |
| Criar paciente | sim | não | não | não | não | sim |
| Criar requisição laboratorial | sim | parcial | sim | não | não | sim |
| Confirmar colheita | não | sim | sim | não | não | sim |
| Lançar resultado | não | sim | sim | não | não | sim |
| Validar resultado | não | não | sim | não | não | sim |
| Emitir laudo | não | não | sim | não | não | sim |
| Criar fatura | sim | não | não | não | sim | sim |
| Registar pagamento | não | não | não | não | sim | sim |
| Gerir produtos | não | não | não | sim | não | sim |
| Ajustar estoque | não | não | não | parcial | não | sim |
| Gerir utilizadores | não | não | não | não | não | sim |

---

## Segurança operacional

- [ ] Credenciais e segredos não ficam no código.
- [ ] Cookies/tokens usam configuração segura em produção.
- [ ] CORS/CSRF são restritos em produção.
- [ ] Erros de autenticação não expõem stack trace.
- [ ] Rate limit ou bloqueio de tentativas existe quando aplicável.
- [ ] Superuser/admin tem política clara.
- [ ] Permissões não dependem apenas do frontend.
- [ ] Rotas sensíveis exigem autenticação.

---

## Estados recomendados

### Utilizador

| Estado | Regra |
| --- | --- |
| `activo` | Pode autenticar e usar permissões atribuídas. |
| `inactivo` | Não pode autenticar. |
| `bloqueado` | Não pode autenticar até desbloqueio autorizado. |
| `pendente` | Aguarda activação/convite quando aplicável. |

### Tenant

| Estado | Regra |
| --- | --- |
| `activo` | Operação normal. |
| `suspenso` | Bloqueia ou limita acesso conforme política. |
| `inactivo` | Não deve permitir operação normal. |
| `trial` | Pode ter limites/feature flags. |

### Sessão

| Estado | Regra |
| --- | --- |
| `activa` | Pode consumir recursos autorizados. |
| `expirada` | Deve redirecionar para login. |
| `revogada` | Não deve permitir acesso. |
| `renovada` | Mantida por actividade real ou refresh válido. |

---

## Dados de demonstração

Para beta, deve existir massa mínima de dados:

- [ ] 2 tenants demo.
- [ ] 1 admin por tenant.
- [ ] 1 recepcionista por tenant.
- [ ] 1 técnico de laboratório por tenant.
- [ ] 1 supervisor laboratorial por tenant.
- [ ] 1 utilizador de farmácia por tenant.
- [ ] 1 caixa/financeiro por tenant.
- [ ] Dados clínicos e financeiros separados por tenant para validar isolamento.

---

## Critério para marcar como beta-ready

Identidade e Acesso só podem ser marcados como `beta-ready` quando:

- [ ] Login funciona de forma estável.
- [ ] Sessão não expira antes de 30 minutos de inactividade real.
- [ ] Sessão expira correctamente após inactividade real.
- [ ] Logout funciona e limpa estado local.
- [ ] Utilizadores são filtrados por tenant.
- [ ] RBAC bloqueia acções proibidas no backend.
- [ ] Frontend oculta menus e acções não permitidas.
- [ ] Tenant isolation foi testado em pelo menos pacientes, laboratório, faturamento, pagamentos e farmácia.
- [ ] Auditoria regista acções críticas.
- [ ] Fluxo com perfis diferentes foi testado manualmente.
- [ ] `FRONTEND_API_EXPOSURE_MATRIX.md` foi actualizado com o estado real após testagem.

---

## Próxima evolução recomendada

Após cumprir este readiness, criar ou consolidar:

- matriz completa de permissões por domínio;
- testes automatizados de RBAC por ViewSet;
- testes automatizados de tenant isolation por domínio;
- documentação de recuperação de palavra-passe;
- política de sessão e refresh token;
- painel administrativo de actividade por utilizador.
