# Autorizacao e permissoes

## Principios atuais

- O grupo `Administrador` deve conseguir aceder a todas as paginas do sistema.
- Regras especificas de modulo devem acrescentar grupos operacionais sem retirar o acesso do `Administrador`.
- Quando uma pagina e bloqueada por permissao, a interface nao deve expor detalhes como "Requer" ou "Seus grupos".
- As paginas protegidas por permissao de pagina devem bloquear o conteudo completo, nao apenas dados ou acoes internas.
- Menus, atalhos e hubs devem seguir a mesma permissao da rota de destino para evitar links para paginas inacessiveis.

## Saude e laboratorio clinico

- `/clinical-laboratory/`
  - Acesso: `Administrador` e `Tecnico de Laboratorio`.
  - Modo: bloqueio de pagina quando o utilizador nao pertence aos grupos permitidos.
  - O atalho no hub de Saude deve aparecer apenas para quem tem acesso a esta rota.

- `/clinical-laboratory/tests/`
  - Acesso: apenas `Administrador`.
  - Inclui as paginas de criacao, detalhe e edicao de exames.

- `/clinical-laboratory/test-fields/`
  - Acesso: apenas `Administrador`.
  - Inclui as paginas de criacao e edicao de campos de exame.

- `/occupational-medicine/`
  - Acesso: `Administrador`, `Recepcionista` e `Contabilidade`.
  - Inclui a listagem e os detalhes de pacientes ocupacionais.

- `/reception/`
  - Acesso: `Administrador`, `Recepcionista` e `Contabilidade`.

- `/consultations/`
  - Acesso: `Administrador`, `Recepcionista` e `Médico`.

- `/medicine/`
  - Acesso: `Administrador` e `Médico`.

- `/requests/new/`
  - Criacao de requisicoes de exames medicos e laboratoriais: `Administrador`, `Recepcionista` e `Médico`.

- `/radiology/`
  - Acesso: `Administrador` e `Radiologia`.
  - O titulo principal deve ser `Radiologia`.

## Comportamento de interface

- A mensagem de acesso limitado nao deve listar grupos requeridos nem grupos do utilizador.
- A pagina de acesso restrito pode mostrar areas disponiveis, desde que essas areas respeitem as permissoes reais do utilizador.
- Se uma rota de modulo for removida de um perfil, tambem deve ser removida dos pontos de navegacao relacionados.

## A destrinchar

- Auditar todas as paginas de Saude e confirmar grupos por rota.
- Separar claramente paginas administrativas de catalogo/configuracao das paginas operacionais.
- Confirmar se submodulos laboratoriais como pedidos, coletas, amostras, resultados, microbiologia, molecular, qualidade e biosseguranca devem ser todos de `Tecnico de Laboratorio` ou se ha excecoes.
- Rever se outros perfis de Saude, como `Medico`, `Enfermeiro`, `Recepcionista`, `Saude Publica`, `Radiologia` e `Farmacia`, devem aceder a alguma tela laboratorial por leitura ou por fluxo de pedido.
- Alinhar `WORKSPACES`, sidebar, subnavs e hubs para que todos usem a mesma politica de autorizacao.
- Definir quando uma rota deve redirecionar e quando deve mostrar a pagina de acesso restrito.
