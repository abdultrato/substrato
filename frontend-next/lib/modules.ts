export type ModuleResource = {
  key: string
  label: string
  endpoint: string
  adminListHref?: string
}

export type ModuleGroup = {
  key: string
  label: string
  resources: ModuleResource[]
}

// Single source of truth for the Django apps currently exposed under /api/v1.
export const MODULES: ModuleGroup[] = [
  {
    key: "clinico",
    label: "Clínico",
    resources: [
      { key: "paciente", label: "Pacientes", endpoint: "/clinico/paciente/", adminListHref: "/admin/clinico/paciente/" },
      { key: "exame", label: "Exames", endpoint: "/clinico/exame/", adminListHref: "/admin/clinico/exame/" },
      { key: "examemedico", label: "Exames Médicos", endpoint: "/clinico/examemedico/", adminListHref: "/admin/clinico/examemedico/" },
      { key: "examecampo", label: "Campos de Exame", endpoint: "/clinico/examecampo/", adminListHref: "/admin/clinico/examecampo/" },
      { key: "examemedicocampo", label: "Campos de Exame Médico", endpoint: "/clinico/examemedicocampo/", adminListHref: "/admin/clinico/examemedicocampo/" },
      { key: "requisicaoanalise", label: "Requisições", endpoint: "/clinico/requisicaoanalise/", adminListHref: "/admin/clinico/requisicaoanalise/" },
      { key: "requisicaoitem", label: "Itens de Requisição", endpoint: "/clinico/requisicaoitem/", adminListHref: "/admin/clinico/requisicaoitem/" },
      { key: "resultadoitem", label: "Resultados", endpoint: "/clinico/resultadoitem/", adminListHref: "/admin/clinico/resultadoitem/" },
    ],
  },
  {
    key: "recepcao",
    label: "Recepção",
    resources: [
      { key: "workspace", label: "Workspace", endpoint: "/recepcao/workspace/", adminListHref: "/admin/recepcao/" },
      { key: "checkin", label: "Check-ins", endpoint: "/recepcao/checkin/", adminListHref: "/admin/recepcao/checkinrecepcao/" },
      { key: "atendimento", label: "Atendimentos", endpoint: "/recepcao/atendimento/", adminListHref: "/admin/recepcao/" },
    ],
  },
  {
    key: "entidades",
    label: "Entidades",
    resources: [
      { key: "empresa", label: "Empresas", endpoint: "/entidades/empresa/", adminListHref: "/admin/entidades/empresa/" },
    ],
  },
  {
    key: "faturamento",
    label: "Faturamento",
    resources: [
      { key: "fatura", label: "Faturas", endpoint: "/faturamento/fatura/", adminListHref: "/admin/faturamento/fatura/" },
      { key: "faturaitem", label: "Itens da Fatura", endpoint: "/faturamento/faturaitem/", adminListHref: "/admin/faturamento/faturaitem/" },
      { key: "historicofatura", label: "Histórico", endpoint: "/faturamento/historicofatura/", adminListHref: "/admin/faturamento/historicofatura/" },
    ],
  },
  {
    key: "pagamentos",
    label: "Pagamentos",
    resources: [
      { key: "pagamento", label: "Pagamentos", endpoint: "/pagamentos/pagamento/", adminListHref: "/admin/pagamentos/pagamento/" },
      { key: "recibo", label: "Recibos", endpoint: "/pagamentos/recibo/", adminListHref: "/admin/pagamentos/recibo/" },
      { key: "transacao", label: "Transações", endpoint: "/pagamentos/transacao/", adminListHref: "/admin/pagamentos/transacao/" },
      { key: "reconciliacao", label: "Reconciliações", endpoint: "/pagamentos/reconciliacao/", adminListHref: "/admin/pagamentos/reconciliacao/" },
    ],
  },
  {
    key: "farmacia",
    label: "Farmácia",
    resources: [
      { key: "produto", label: "Produtos", endpoint: "/farmacia/produto/", adminListHref: "/admin/farmacia/produto/" },
      { key: "lote", label: "Lotes", endpoint: "/farmacia/lote/", adminListHref: "/admin/farmacia/lote/" },
      { key: "movimentoestoque", label: "Movimentos de Estoque", endpoint: "/farmacia/movimentoestoque/", adminListHref: "/admin/farmacia/movimentoestoque/" },
      { key: "venda", label: "Vendas", endpoint: "/farmacia/venda/", adminListHref: "/admin/farmacia/venda/" },
      { key: "itemvenda", label: "Itens de Venda", endpoint: "/farmacia/itemvenda/", adminListHref: "/admin/farmacia/itemvenda/" },
    ],
  },
  {
    key: "enfermagem",
    label: "Enfermagem",
    resources: [
      { key: "evolucaoenfermagem", label: "Evoluções", endpoint: "/enfermagem/evolucaoenfermagem/", adminListHref: "/admin/enfermagem/evolucaoenfermagem/" },
      { key: "procedimento", label: "Procedimentos", endpoint: "/enfermagem/procedimento/", adminListHref: "/admin/enfermagem/procedimento/" },
      { key: "procedimentocatalogo", label: "Catálogo", endpoint: "/enfermagem/procedimentocatalogo/", adminListHref: "/admin/enfermagem/procedimentocatalogo/" },
      { key: "procedimentocatalogomaterial", label: "Materiais do Catálogo", endpoint: "/enfermagem/procedimentocatalogomaterial/", adminListHref: "/admin/enfermagem/procedimentocatalogomaterial/" },
      { key: "procedimentoitem", label: "Itens do Procedimento", endpoint: "/enfermagem/procedimentoitem/", adminListHref: "/admin/enfermagem/procedimentoitem/" },
      { key: "procedimentoitemvalor", label: "Valores do Item", endpoint: "/enfermagem/procedimentoitemvalor/", adminListHref: "/admin/enfermagem/procedimentoitemvalor/" },
      { key: "procedimentomaterial", label: "Materiais do Procedimento", endpoint: "/enfermagem/procedimentomaterial/", adminListHref: "/admin/enfermagem/procedimentomaterial/" },
      { key: "procedimentomaterialvalor", label: "Valores do Material", endpoint: "/enfermagem/procedimentomaterialvalor/", adminListHref: "/admin/enfermagem/procedimentomaterialvalor/" },
      { key: "prescricaoenfermagem", label: "Prescrições", endpoint: "/enfermagem/prescricaoenfermagem/", adminListHref: "/admin/enfermagem/prescricaoenfermagem/" },
      { key: "registroenfermagem", label: "Registros", endpoint: "/enfermagem/registroenfermagem/", adminListHref: "/admin/enfermagem/registroenfermagem/" },
      { key: "sinalvitalenfermagem", label: "Sinais Vitais", endpoint: "/enfermagem/sinalvitalenfermagem/", adminListHref: "/admin/enfermagem/sinalvitalenfermagem/" },
    ],
  },
  {
    key: "seguradora",
    label: "Seguradora",
    resources: [
      { key: "seguradora", label: "Seguradoras", endpoint: "/seguradora/seguradora/", adminListHref: "/admin/seguradora/seguradora/" },
      { key: "planocobertura", label: "Planos", endpoint: "/seguradora/planocobertura/", adminListHref: "/admin/seguradora/planocobertura/" },
      { key: "autorizacaoprocedimento", label: "Autorizações", endpoint: "/seguradora/autorizacaoprocedimento/", adminListHref: "/admin/seguradora/autorizacaoprocedimento/" },
    ],
  },
  {
    key: "contabilidade",
    label: "Contabilidade",
    resources: [
      { key: "conta", label: "Contas", endpoint: "/contabilidade/conta/", adminListHref: "/admin/contabilidade/conta/" },
      { key: "lancamento", label: "Lançamentos", endpoint: "/contabilidade/lancamento/", adminListHref: "/admin/contabilidade/lancamento/" },
      { key: "movimento", label: "Movimentos", endpoint: "/contabilidade/movimento/", adminListHref: "/admin/contabilidade/movimento/" },
      { key: "conciliacaofinanceira", label: "Conciliações", endpoint: "/contabilidade/conciliacaofinanceira/", adminListHref: "/admin/contabilidade/conciliacaofinanceira/" },
    ],
  },
  {
    key: "consultas",
    label: "Consultas",
    resources: [
      { key: "consulta", label: "Consultas", endpoint: "/consultas/consulta/", adminListHref: "/admin/consultas/consultamedica/" },
      { key: "medicos", label: "Médicos", endpoint: "/consultas/medicos/" },
      { key: "especialidade", label: "Especialidades", endpoint: "/consultas/especialidade/", adminListHref: "/admin/consultas/especialidadeconsulta/" },
      { key: "feriado", label: "Feriados", endpoint: "/consultas/feriado/", adminListHref: "/admin/consultas/feriado/" },
    ],
  },
  {
    key: "inquilinos",
    label: "Inquilinos",
    resources: [
      { key: "inquilino", label: "Inquilinos", endpoint: "/inquilinos/inquilino/", adminListHref: "/admin/inquilinos/inquilino/" },
      { key: "planoassinatura", label: "Planos", endpoint: "/inquilinos/planoassinatura/", adminListHref: "/admin/inquilinos/planoassinatura/" },
      { key: "configuracaoinquilino", label: "Configurações", endpoint: "/inquilinos/configuracaoinquilino/", adminListHref: "/admin/inquilinos/configuracaoinquilino/" },
      { key: "usotenant", label: "Uso do Tenant", endpoint: "/inquilinos/usotenant/", adminListHref: "/admin/inquilinos/usotenant/" },
      { key: "featureflagtenant", label: "Feature Flags", endpoint: "/inquilinos/featureflagtenant/", adminListHref: "/admin/inquilinos/featureflagtenant/" },
    ],
  },
  {
    key: "notificacoes",
    label: "Notificações",
    resources: [
      { key: "notificacao", label: "Notificações", endpoint: "/notificacoes/notificacao/", adminListHref: "/admin/notificacoes/notificacao/" },
      { key: "logenvio", label: "Logs de Envio", endpoint: "/notificacoes/logenvio/", adminListHref: "/admin/notificacoes/logenvio/" },
    ],
  },
  {
    key: "identidade",
    label: "Identidade",
    resources: [
      { key: "usuario", label: "Usuários", endpoint: "/identidade/usuario/", adminListHref: "/admin/identidade/usuario/" },
      { key: "perfilprofissional", label: "Perfis Profissionais", endpoint: "/identidade/perfilprofissional/", adminListHref: "/admin/identidade/perfilprofissional/" },
      { key: "passwordresettoken", label: "Tokens de Reset", endpoint: "/identidade/passwordresettoken/", adminListHref: "/admin/identidade/passwordresettoken/" },
    ],
  },
  {
    key: "prontuario",
    label: "Prontuário",
    resources: [
      { key: "registro", label: "Cardex", endpoint: "/prontuario/registro/", adminListHref: "/admin/prontuario/registroprontuario/" },
      { key: "prescricaoitem", label: "Itens de Prescrição", endpoint: "/prontuario/prescricaoitem/", adminListHref: "/admin/prontuario/prescricaoitem/" },
    ],
  },
  {
    key: "maternidade",
    label: "Maternidade",
    resources: [
      { key: "gestacao", label: "Gestações", endpoint: "/maternidade/gestacao/", adminListHref: "/admin/maternidade/gestacao/" },
    ],
  },
  {
    key: "cirurgia",
    label: "Cirurgia",
    resources: [
      { key: "cirurgia", label: "Cirurgias", endpoint: "/cirurgia/cirurgia/", adminListHref: "/admin/cirurgia/cirurgia/" },
      { key: "procedimentocirurgico", label: "Procedimentos Cirúrgicos", endpoint: "/cirurgia/procedimentocirurgico/", adminListHref: "/admin/cirurgia/procedimentocirurgico/" },
    ],
  },
  {
    key: "recursos_humanos",
    label: "Recursos Humanos",
    resources: [
      { key: "cargo", label: "Cargos", endpoint: "/recursos_humanos/cargo/", adminListHref: "/admin/recursos_humanos/cargo/" },
      { key: "funcionario", label: "Funcionários", endpoint: "/recursos_humanos/funcionario/", adminListHref: "/admin/recursos_humanos/funcionario/" },
      { key: "agregadofamiliar", label: "Agregados Familiares", endpoint: "/recursos_humanos/agregadofamiliar/", adminListHref: "/admin/recursos_humanos/agregadofamiliar/" },
      { key: "horario", label: "Horários", endpoint: "/recursos_humanos/horario/", adminListHref: "/admin/recursos_humanos/horariotrabalho/" },
      { key: "falta", label: "Faltas", endpoint: "/recursos_humanos/falta/", adminListHref: "/admin/recursos_humanos/falta/" },
      { key: "ferias", label: "Férias", endpoint: "/recursos_humanos/ferias/", adminListHref: "/admin/recursos_humanos/ferias/" },
      { key: "dispensa", label: "Dispensas", endpoint: "/recursos_humanos/dispensa/", adminListHref: "/admin/recursos_humanos/dispensa/" },
      { key: "horaextra", label: "Horas Extras", endpoint: "/recursos_humanos/horaextra/", adminListHref: "/admin/recursos_humanos/horaextra/" },
      { key: "folhapagamento", label: "Folhas de Pagamento", endpoint: "/recursos_humanos/folhapagamento/", adminListHref: "/admin/recursos_humanos/folhapagamento/" },
    ],
  },
  {
    key: "monitoramento",
    label: "Monitoramento",
    resources: [
      { key: "erro", label: "Erros do Sistema", endpoint: "/monitoramento/erro/", adminListHref: "/admin/monitoramento/errosistema/" },
    ],
  },
]

export function findModuleGroup(key: string): ModuleGroup | undefined {
  return MODULES.find((m) => m.key === key)
}

export function findModuleResource(
  groupKey: string,
  resourceKey: string
): { group: ModuleGroup; resource: ModuleResource } | null {
  const group = findModuleGroup(groupKey)
  if (!group) return null
  const resource = group.resources.find((r) => r.key === resourceKey)
  if (!resource) return null
  return { group, resource }
}
