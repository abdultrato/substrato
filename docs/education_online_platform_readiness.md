# Education Online Platform Readiness

Data da avaliacao: 22 de maio de 2026

## 1. Objetivo
Mapear as capacidades que uma plataforma real de educacao online deve ter, comparar com o estado atual do projeto e indicar:

1. Em que passo o projeto esta hoje.
2. Em que passo deve estar para ser funcional em ensino online com provas e trabalhos temporizados.

---

## 2. Diagnostico do estado atual (projeto Substrato)

### 2.1 O que ja existe e funciona
1. Dominio education novo com modelos principais:
   - `Course`, `Classroom`, `Enrollment`, `AttendanceRecord`, `GradeRecord`, `Examination`, `LearningContent`, `Skill`.
2. API v1 com CRUD por recurso (`/api/v1/education/*`) e filtros.
3. RBAC e escopo por tenant/usuario para estudante/professor/direcao.
4. Servicos de aplicacao + eventos de dominio para fluxos criticos:
   - estudante criado, matricula ativada, presenca registada, nota publicada, exame agendado, conteudo publicado.
5. Telas frontend de Education para list/create/edit/delete/detail de todos os recursos do modulo.
6. Testes de API e eventos do dominio a passar.

### 2.2 O que ainda nao existe (lacunas criticas para ensino online real)
1. Nao existe modelo/fluxo de `Assignment` (trabalho) e `Submission` (submissao).
2. Nao existe motor de prova online por tentativa (exam session/attempt).
3. Nao existe janela de prova com:
   - inicio efetivo,
   - fim efetivo,
   - bloqueio automatico por tempo,
   - impossibilidade de repetir apos abertura do estudante.
4. Nao existe expiracao dura de submissao na data/hora limite.
5. Nao existe ligacao formal entre nota e submissao entregue (nota por trabalho/teste/atividade).
6. Nao existe calendario academico operacional com milestones e cronologia de entregas.
7. Nao existe notificacao transacional para deadlines/provas/resultados.
8. Nao existe trilha de integridade academica para tentativa/proctoring/log de fraude.

---

## 3. Mapa completo de capacidades de uma plataforma de educacao online

Legenda de status:
- `Implementado`: pronto para uso.
- `Parcial`: existe base, mas sem regras completas de operacao online.
- `Ausente`: nao existe no modulo atual.

### Bloco A - Identidade, acesso e governanca
1. Login unico com perfis estudante/professor/gestao.
2. Escopo por tenant e isolamento de dados.
3. RBAC por recurso e por acao.
4. Auditoria de acoes academicas.
5. Politicas de seguranca (senha, sessao, 2FA opcional).

Status atual: `Parcial` (1,2,3 existem; 4 e 5 ainda incompletos para contexto academico online).

### Bloco B - Estrutura academica base
1. Cursos/disciplina.
2. Turmas por ano letivo.
3. Perfis de estudante/professor.
4. Matricula e estados da matricula.
5. Presenca por data e estado.

Status atual: `Implementado`.

### Bloco C - Conteudo e trilha de aprendizagem
1. Publicacao de aula/documento/video/link.
2. Organizacao por modulo/unidade/ordem pedagogica.
3. Pre-requisitos entre conteudos.
4. Versionamento e historico de alteracoes.
5. Controle de visibilidade por turma.

Status atual: `Parcial` (publicacao existe; trilha pedagogica estruturada e versionamento nao estao fechados).

### Bloco D - Provas online temporizadas (core da sua exigencia)
1. Banco de questoes e composicao de prova.
2. Janela de abertura/encerramento da prova (start/end).
3. Sessao de tentativa por estudante (`ExamAttempt`).
4. Bloqueio de nova tentativa apos prova aberta/iniciada.
5. Auto-submit no fim do tempo.
6. Imutabilidade de tentativa apos encerramento.
7. Correcao automatica (quando aplicavel) + manual.

Status atual: `Ausente`.

### Bloco E - Trabalhos/atividades e submissao com prazo
1. Criacao de trabalho com descricao, rubric e anexos.
2. Cronograma com `opens_at`, `due_at`, `grace_until` (opcional).
3. Submissao unica ou multipla por regra.
4. Expiracao exata da submissao na data/hora limite.
5. Estado da submissao (draft/submitted/late/expired/graded).
6. Reenvio apenas se politica permitir.

Status atual: `Ausente`.

### Bloco F - Avaliacao por professor (nota por entrega)
1. Nota associada a submissao especifica.
2. Feedback textual e rubric por criterio.
3. Revisao de nota com historico.
4. Publicacao de resultado ao estudante.
5. Calculo de medias ponderadas por periodo.

Status atual: `Parcial` (nota existe, mas nao esta vinculada a entidade de submissao/trabalho).

### Bloco G - Experiencia do estudante
1. Dashboard com agenda, prazos e provas.
2. Tela de prova com cronometro e bloqueios.
3. Upload de trabalhos e comprovativo de envio.
4. Historico de notas e feedback por atividade.
5. Notificacoes de proximidade de prazo/prova.

Status atual: `Parcial` (dashboard/consulta basica existe; prova online e submissao nao).

### Bloco H - Experiencia do professor
1. Planeamento de aulas e atividades.
2. Agendamento de prova/trabalho por turma.
3. Correcao em lote e feedback.
4. Publicacao de notas por atividade.
5. Exportacao de pauta/relatorio.

Status atual: `Parcial`.

### Bloco I - Calendario academico e cronologia
1. Calendario letivo por tenant.
2. Marcos obrigatorios (provas, trabalhos, fecho de pauta).
3. Conflito de agenda (detecao).
4. Feriados e excecoes.

Status atual: `Parcial` (agendamento de exame existe; calendario completo nao).

### Bloco J - Comunicacao e notificacoes
1. Email/push/in-app para eventos academicos.
2. Alertas de expiracao de prazo.
3. Confirmacoes de submissao e publicacao de nota.
4. Mensageria professor-estudante (opcional fase 2).

Status atual: `Ausente` para fluxo academico online.

### Bloco K - Integridade academica
1. Logs de tentativa e tempo em prova.
2. Bloqueios de navegacao e anti-cola (por politica).
3. Aleatorizacao de questoes (opcional).
4. Registro de incidentes.

Status atual: `Ausente`.

### Bloco L - Relatorios e analitica
1. Performance por estudante/turma/curso.
2. Taxa de entrega em prazo.
3. Taxa de ausencia e risco de evasao.
4. Distribuicao de notas por atividade.

Status atual: `Parcial` (dados base existem, analitica academica dedicada ainda nao).

### Bloco M - Operacao, confiabilidade e compliance
1. Observabilidade (logs metricas traces) por modulo education.
2. Backups e restore testado.
3. Politica de retencao de dados.
4. Privacidade e conformidade legal.
5. Testes E2E de fluxos criticos.

Status atual: `Parcial`.

---

## 4. Em que passo o projeto esta hoje

Escala de maturidade (0-6):

0. Descoberta e desenho.
1. Fundacao de dominio (modelos/migracoes).
2. Operacao academica base (CRUD + RBAC + tenant + eventos + frontend CRUD).
3. LMS operacional interno (fluxos pedagogicos fechados sem prova/submissao online completa).
4. Ensino online funcional (prova temporizada + submissao com expiracao + nota por entrega + notificacoes).
5. Operacao robusta em producao (integridade academica, analitica, observabilidade forte, E2E completo).
6. Escala multi-tenant madura (otimizacao, automacoes avancadas e governanca completa).

**Passo atual do projeto: `2` (entre 2 e 3).**

Justificativa:
1. Base de dominio e CRUD completos.
2. RBAC/tenant/eventos implementados e testados.
3. Falta o nucleo de ensino online real (provas temporizadas e submissoes com prazo expiravel).

---

## 5. Em que passo deveria estar para ser funcional

### Minimo funcional para o que voce descreveu
**Passo alvo minimo: `4`.**

Para considerar funcional em ensino online real, precisa fechar obrigatoriamente:
1. Entidades e regras de `Assignment`, `Submission`, `ExamAttempt`.
2. Janela de prova com inicio/fim e bloqueio automatico.
3. Regra de tentativa unica (ou max attempts) sem reversao/repeticao apos abertura.
4. Expiracao exata de submissao na data/hora limite.
5. Nota vinculada a trabalho/teste/atividade submetida.
6. Publicacao de resultado e historico auditavel.

### Alvo recomendado para operar "a todo vapor"
**Passo recomendado: `5`.**

Inclui:
1. Notificacoes transacionais completas.
2. Relatorios academicos acionaveis.
3. Integridade academica e observabilidade madura.
4. Suite E2E dos fluxos criticos.

---

## 6. Ordem pratica de execucao (roadmap objetivo)

### Fase 1 (obrigatoria): motor de avaliacao online
1. Criar modelos: `Assessment`, `AssessmentWindow`, `ExamAttempt`, `ExamQuestion`, `ExamAnswer`.
2. Regras de dominio:
   - `opened_at` e `closed_at`,
   - `attempt_status`,
   - `max_attempts`,
   - bloqueio apos abertura/fecho.
3. Endpoints dedicados:
   - iniciar tentativa,
   - submeter tentativa,
   - finalizar por timeout.
4. Testes unitarios + integracao para regras de tempo e bloqueio.

### Fase 2 (obrigatoria): trabalhos e submissoes com prazo
1. Criar modelos: `Assignment`, `AssignmentSubmission`, `SubmissionAttachment`.
2. Regras de expiracao dura em `due_at`.
3. Endpoints:
   - criar/publicar trabalho,
   - submeter,
   - validar prazo automaticamente.
4. Testes para submissao em tempo, fora de tempo, e lock de estado.

### Fase 3 (obrigatoria): avaliacao docente por entrega
1. Vincular `GradeRecord` a tentativa/submissao.
2. Adicionar rubric, feedback e revisao de nota.
3. Publicacao de nota com evento de dominio.
4. Telas professor/estudante para corrigir e consultar.

### Fase 4 (recomendada): operacao e escala
1. Notificacoes de prazo/prova/resultado.
2. Relatorios de desempenho e risco.
3. E2E: matricula -> prova/trabalho -> submissao -> avaliacao -> resultado.
4. Hardening de seguranca, auditoria e observabilidade.

---

## 7. Conclusao objetiva

1. O projeto tem uma **boa base estrutural** de Education.
2. Para ensino online real, o modulo ainda **nao esta funcional** no que e mais critico (provas/trabalhos temporizados e submissao expirada por regra).
3. O salto necessario e sair do passo atual (`2`) para o passo minimo funcional (`4`), idealmente consolidando no passo (`5`).

## Alinhamento com beta e produção

**Última revisão documental:** 2026-05-30.

**Propósito no projecto.** Governa a migração e prontidão do domínio Education dentro do Substrato.

**Valor que protege.** Protege compatibilidade com o legado, continuidade académica e integração segura com identidade, pagamentos e relatórios.

**Como usar na implementação.**
1. Ler este documento antes de alterar modelos, serializers, viewsets, tarefas, páginas, contratos ou prompts relacionados.
2. Confirmar impacto em tenant, RBAC, auditoria, dados sensíveis, jobs assíncronos, PDFs, eventos e experiência do utilizador.
3. Actualizar testes, schemas, runbooks e documentação no mesmo ciclo da alteração.
4. Registar dívida técnica remanescente com owner, impacto e prazo.

**Até produção beta.** Deve validar estudantes, professores, turmas, matrículas, avaliações, exames, presenças e workspaces principais.

**Para production-ready.** Exige migração auditável, rollback, contratos de dados, formação operacional e critérios de descontinuação do legado.
