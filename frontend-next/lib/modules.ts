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
