type CreateLabelLanguage = "pt" | "en" | string

const PT_WORD_SINGULAR: Record<string, string> = {
  actividades: "actividade",
  alunos: "aluno",
  analises: "analise",
  análises: "análise",
  armazens: "armazem",
  armazéns: "armazém",
  armazenamentos: "armazenamento",
  aulas: "aula",
  avaliacoes: "avaliacao",
  avaliações: "avaliação",
  autorizacoes: "autorizacao",
  autorizações: "autorização",
  camas: "cama",
  campos: "campo",
  cargos: "cargo",
  categorias: "categoria",
  checkins: "check-in",
  "check-ins": "check-in",
  ciclicos: "ciclico",
  cíclicos: "cíclico",
  cirurgias: "cirurgia",
  clientes: "cliente",
  competencias: "competencia",
  competências: "competência",
  conciliacoes: "conciliacao",
  conciliações: "conciliação",
  configuracoes: "configuracao",
  configurações: "configuração",
  consultas: "consulta",
  contas: "conta",
  conteudos: "conteudo",
  conteúdos: "conteúdo",
  cursos: "curso",
  diarias: "diaria",
  diárias: "diária",
  disciplinas: "disciplina",
  disciplinares: "disciplinar",
  dispensas: "dispensa",
  documentos: "documento",
  doacoes: "doacao",
  doações: "doação",
  equipamentos: "equipamento",
  erros: "erro",
  especialidades: "especialidade",
  estudantes: "estudante",
  exames: "exame",
  expedicoes: "expedicao",
  expedições: "expedição",
  exportacoes: "exportacao",
  exportações: "exportação",
  familiares: "familiar",
  faturas: "fatura",
  ficheiros: "ficheiro",
  folhas: "folha",
  funcionarios: "funcionario",
  funcionários: "funcionário",
  gestacoes: "gestacao",
  gestações: "gestação",
  grandes: "grande",
  gerais: "geral",
  horarios: "horario",
  horários: "horário",
  indicadores: "indicador",
  inspecoes: "inspecao",
  inspeções: "inspeção",
  integracoes: "integracao",
  integrações: "integração",
  internamentos: "internamento",
  inventarios: "inventario",
  inventários: "inventário",
  itens: "item",
  lancamentos: "lancamento",
  lançamentos: "lançamento",
  linhas: "linha",
  listas: "lista",
  localizacoes: "localizacao",
  localizações: "localização",
  logs: "log",
  lotes: "lote",
  manutencoes: "manutencao",
  manutenções: "manutenção",
  materiais: "material",
  matriculas: "matricula",
  matrículas: "matrícula",
  medicos: "medico",
  médicos: "médico",
  mensagens: "mensagem",
  modelos: "modelo",
  movimentos: "movimento",
  notificacoes: "notificacao",
  notificações: "notificação",
  ocorrencias: "ocorrencia",
  ocorrências: "ocorrência",
  operacionais: "operacional",
  ordens: "ordem",
  pacientes: "paciente",
  pagamentos: "pagamento",
  pedidos: "pedido",
  pequenas: "pequena",
  perfis: "perfil",
  planos: "plano",
  presencas: "presenca",
  presenças: "presença",
  prescricoes: "prescricao",
  prescrições: "prescrição",
  processos: "processo",
  produtos: "produto",
  professores: "professor",
  profissionais: "profissional",
  profissoes: "profissao",
  profissões: "profissão",
  recebimentos: "recebimento",
  recibos: "recibo",
  reconciliacoes: "reconciliacao",
  reconciliações: "reconciliação",
  referencias: "referencia",
  referências: "referência",
  registros: "registo",
  registos: "registo",
  regras: "regra",
  requisicoes: "requisicao",
  requisições: "requisição",
  reservas: "reserva",
  resultados: "resultado",
  saldos: "saldo",
  seguradoras: "seguradora",
  sinais: "sinal",
  sugestoes: "sugestao",
  sugestões: "sugestão",
  turmas: "turma",
  transacoes: "transacao",
  transações: "transação",
  transferencias: "transferencia",
  transferências: "transferência",
  transfusoes: "transfusao",
  transfusões: "transfusão",
  unidades: "unidade",
  usuarios: "usuario",
  usuários: "usuário",
  utilizadores: "utilizador",
  valores: "valor",
  vendas: "venda",
}

const EN_WORD_SINGULAR: Record<string, string> = {
  activities: "activity",
  analyses: "analysis",
  categories: "category",
  deliveries: "delivery",
  entries: "entry",
  invoices: "invoice",
  people: "person",
  policies: "policy",
  queries: "query",
}

function normalizeCreateContext(label: string): string {
  return String(label || "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^tod[ao]s?\s+(as|os)\s+/iu, "")
}

function splitWordToken(token: string): [string, string, string] {
  const match = token.match(/^([([{"'`]*)(.*?)([\])}"'`,.;:]*)$/u)
  return [match?.[1] || "", match?.[2] || token, match?.[3] || ""]
}

function singularizePtWord(word: string): string {
  const mapped = PT_WORD_SINGULAR[word]
  if (mapped) return mapped

  if (word.length <= 3) return word
  if (word.endsWith("ções")) return `${word.slice(0, -4)}ção`
  if (word.endsWith("coes")) return `${word.slice(0, -4)}cao`
  if (word.endsWith("ões")) return `${word.slice(0, -3)}ão`
  if (word.endsWith("oes")) return `${word.slice(0, -3)}ao`
  if (word.endsWith("ais")) return `${word.slice(0, -3)}al`
  if (word.endsWith("eis")) return `${word.slice(0, -3)}el`
  if (word.endsWith("icos")) return `${word.slice(0, -4)}ico`
  if (word.endsWith("icas")) return `${word.slice(0, -4)}ica`
  if (word.endsWith("ários")) return `${word.slice(0, -5)}ário`
  if (word.endsWith("arias")) return `${word.slice(0, -5)}aria`
  if (word.endsWith("s")) return word.slice(0, -1)
  return word
}

function singularizeEnWord(word: string): string {
  const mapped = EN_WORD_SINGULAR[word]
  if (mapped) return mapped

  if (word.length <= 3) return word
  if (word.endsWith("ies")) return `${word.slice(0, -3)}y`
  if (word.endsWith("ses")) return word.slice(0, -2)
  if (word.endsWith("s") && !word.endsWith("ss")) return word.slice(0, -1)
  return word
}

export function singularizeResourceLabel(label: string, language: CreateLabelLanguage = "pt"): string {
  const locale = language === "en" ? "en-US" : "pt-PT"
  const normalized = normalizeCreateContext(label).toLocaleLowerCase(locale)
  const singularizeWord = language === "en" ? singularizeEnWord : singularizePtWord

  return normalized
    .split(/(\s+)/u)
    .map((part) => {
      if (!part.trim()) return part
      const [prefix, word, suffix] = splitWordToken(part)
      if (!word) return part
      return `${prefix}${singularizeWord(word)}${suffix}`
    })
    .join("")
}

export function createResourceActionLabel(label: string, language: CreateLabelLanguage = "pt"): string {
  const context = singularizeResourceLabel(label, language)
  if (!context) return language === "en" ? "Create record" : "Criar registo"
  return language === "en" ? `Create ${context}` : `Criar ${context}`
}
