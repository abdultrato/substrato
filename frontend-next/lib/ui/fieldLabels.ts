import { educationResourceKeyFromEndpoint } from "@/lib/education/ui"

type LabelsByField = Record<string, string>

const INTERNAL_FIELDS = new Set([
  "id",
  "created_at",
  "updated_at",
  "custom_id",
  "deleted",
  "deleted_at",
  "version",
  "created_by",
  "updated_by",
  "deleted_by",
  "tenant",
])

const COMMON_LABELS: LabelsByField = {
  name: "Nome",
  title: "Título",
  description: "Descrição",
  body: "Conteúdo",
  instructions: "Instruções",
  notes: "Observações",
  location: "Localização",
  status: "Estado",
  code: "Código",
  category: "Categoria",
  level: "Nível",
  email: "Email",
  phone: "Telefone",
  address: "Endereço",
  user: "Utilizador",
  tenant: "Instituição",
  course: "Curso",
  classroom: "Turma",
  student: "Estudante",
  teacher: "Professor",
  enrollment: "Matrícula",
  author: "Professor autor",
  assignment: "Trabalho",
  assignment_submission: "Submissão de trabalho",
  examination: "Exame",
  examination_attempt: "Tentativa de exame",
  attendance_date: "Data da presença",
  date: "Data",
  start_date: "Data inicial",
  end_date: "Data final",
  created_at: "Criado em",
  updated_at: "Atualizado em",
  published: "Publicado",
  published_at: "Publicado em",
  file_url: "URL do ficheiro",
  external_url: "Link externo",
  attachment_url: "URL do anexo",
  content_type: "Tipo de conteúdo",
  score: "Nota",
  max_score: "Nota máxima",
  weight: "Peso",
  component: "Componente",
  pass_mark: "Nota mínima de aprovação",
  scheduled_for: "Agendado para",
  opens_at: "Abre em",
  closes_at: "Fecha em",
  due_at: "Prazo de entrega",
  submitted_at: "Submetido em",
  graded_at: "Avaliado em",
  graded_by: "Avaliado por",
  teacher_feedback: "Feedback do professor",
  content_text: "Texto da submissão",
  submission_payload: "Conteúdo da resposta",
  attempt_number: "Número da tentativa",
  duration_minutes: "Duração (minutos)",
  max_attempts: "Tentativas máximas",
  max_submissions: "Submissões máximas",
  allow_late_submission: "Permitir submissão fora do prazo",
  allow_multiple_submissions: "Permitir várias submissões",
  work_category: "Categoria do trabalho",
  exam_type: "Tipo de exame",
  test_slot: "Número do teste",
  discipline_final_stage: "Etapa do exame final",
  random_seed: "Semente aleatória",
  question_count: "Número de questões",
  academic_year: "Ano letivo",
  capacity: "Capacidade",
  workload_hours: "Carga horária",
  homeroom_teacher: "Diretor de turma",
  enrolled_on: "Matriculado em",
  closed_on: "Encerrado em",
  student_code: "Código do estudante",
  teacher_code: "Código do professor",
  birth_date: "Data de nascimento",
  guardian_name: "Encarregado de educação",
  specialty: "Especialidade",
  item_type: "Tipo de item",
  scheduled_date: "Data programada",
  requires_attendance: "Requer presença",
  completed_at: "Concluído em",
  linked_examination: "Exame vinculado",
  linked_assignment: "Trabalho vinculado",
  linked_content: "Conteúdo vinculado",
  schedule_item: "Item do cronograma",
  completion_marked: "Marcar como concluído",
  attendance_status_snapshot: "Estado de presença registado",
  time_limit_minutes_snapshot: "Tempo limite registado",
  max_score_snapshot: "Nota máxima registada",
  requires_year_repeat: "Requer repetição de ano",
  maintenance_type: "Tipo de manutenção",
  maintenance_type_display: "Tipo de manutenção",
  incident: "Ocorrência",
  incident_code: "Ocorrência",
  incident_context: "Contexto da ocorrência",
  equipment_name: "Equipamento",
  equipment_serial_number: "Número de série",
  requires_maintenance: "Requer manutenção",
  maintenance_status: "Estado da manutenção",
  maintenance_requested_at: "Pedido de manutenção em",
  maintenance_completed_at: "Manutenção concluída em",
  post_incident_actions: "Ações após ocorrência",
  is_active: "Ativo",
  active: "Ativo",
  modality: "Modalidade",
  protocol: "Protocolo",
  manufacturer: "Fabricante",
  model: "Modelo",
  serial_number: "Número de série",
  connection_mode: "Modo de comunicação",
  tcp_host: "Host TCP/IP",
  tcp_port: "Porta TCP/IP",
  tcp_timeout_seconds: "Timeout TCP/IP (s)",
  tcp_framing: "Enquadramento TCP/IP",
  encoding: "Codificação",
  auto_consume_results: "Consumir resultados automaticamente",
  supported_exam_types: "Tipos de exame suportados",
  last_seen_at: "Última comunicação",
  config: "Configuração",
}

const EDUCATION_LABELS: Record<string, LabelsByField> = {
  student: {
    status: "Estado do estudante",
    notes: "Observações do estudante",
  },
  teacher: {
    status: "Estado do professor",
  },
  course: {
    name: "Nome do curso",
    code: "Código do curso",
    description: "Descrição do curso",
    workload_hours: "Carga horária",
    status: "Estado do curso",
  },
  classroom: {
    name: "Nome da turma",
    course: "Curso",
    capacity: "Capacidade da turma",
  },
  enrollment: {
    status: "Estado da matrícula",
  },
  attendance: {
    status: "Estado da presença",
  },
  grade: {
    component: "Componente de avaliação",
    score: "Nota obtida",
  },
  examination: {
    title: "Título do exame",
    status: "Estado do exame",
  },
  random_test: {
    title: "Título do teste",
    status: "Estado do teste",
  },
  assignment: {
    title: "Título do trabalho",
    status: "Estado do trabalho",
  },
  submission: {
    status: "Estado da submissão",
  },
  exam_attempt: {
    status: "Estado da tentativa",
  },
  content: {
    title: "Título do conteúdo",
    body: "Conteúdo de aprendizagem",
  },
  bibliography: {
    title: "Título da referência",
    body: "Resumo e orientação de estudo",
  },
  thematic_map: {
    title: "Título do mapa temático",
    body: "Estrutura temática",
  },
  discipline_schedule: {
    title: "Título do item",
    status: "Estado do item",
  },
  schedule_progress: {
    status: "Estado do progresso",
  },
  skill: {
    name: "Nome da competência",
    code: "Código da competência",
    description: "Descrição da competência",
    status: "Estado da competência",
  },
}

const BLOODBANK_LABELS: Record<string, LabelsByField> = {
  storage: {
    name: "Nome",
    location: "Localização",
    capacity_units: "Capacidade (unidades)",
    temperature_min_c: "Temperatura mínima (°C)",
    temperature_max_c: "Temperatura máxima (°C)",
    is_active: "Ativo",
    last_validation_at: "Última validação",
    notes: "Observações",
  },
  storage_maintenance: {
    storage: "Armazenamento",
    maintenance_type: "Tipo de manutenção",
    status: "Estado",
    scheduled_at: "Agendada para",
    performed_at: "Executada em",
    next_due_at: "Próxima manutenção",
    technician_name: "Técnico responsável",
    findings: "Achados",
    actions_taken: "Ações executadas",
    notes: "Observações",
  },
  donation: {
    bag_identifier: "Bolsa (identificador)",
    donor: "Doador",
    donor_role: "Tipo de doador",
    donation_type: "Tipo de doação",
    blood_type: "Tipo sanguíneo",
    status: "Estado",
    screening_status: "Triagem",
    collected_at: "Coleta",
    processed_at: "Processamento",
    volume_ml: "Volume (mL)",
    notes: "Observações",
  },
  unit: {
    unit_number: "Número da unidade",
    component_type: "Componente",
    status: "Estado",
    donation: "Doação",
    storage: "Armazenamento",
    reserved_for: "Reservada para",
    collected_at: "Coleta",
    expires_at: "Validade",
    notes: "Observações",
  },
  transfusion: {
    recipient: "Paciente",
    blood_unit: "Unidade",
    status: "Estado",
    requested_at: "Solicitada em",
    started_at: "Iniciada em",
    finished_at: "Concluída em",
    indication: "Indicação",
    notes: "Observações",
  },
  stock_movement: {
    movement_type: "Tipo de movimento",
    unit: "Unidade",
    source_storage: "Origem",
    destination_storage: "Destino",
    moved_at: "Movimentado em",
    reason: "Motivo",
    notes: "Observações",
  },
}

const WAREHOUSE_COMMON_LABELS: LabelsByField = {
  name: "Nome",
  code: "Código",
  status: "Estado",
  notes: "Observações",
  address: "Endereço",
  warehouse: "Armazém",
  warehouse_type: "Tipo de armazém",
  warehouse_label: "Armazém",
  parent: "Localização superior",
  location: "Localização",
  location_type: "Tipo de localização",
  location_code: "Código da localização",
  source_location: "Localização de origem",
  destination_location: "Localização de destino",
  default_location: "Localização padrão",
  preferred_location: "Localização preferencial",
  barcode: "Código de barras",
  category: "Categoria",
  category_label: "Categoria",
  pharmacy_product: "Produto de farmácia",
  item: "Item",
  item_type: "Tipo de item",
  item_sku: "SKU do item",
  sku: "SKU",
  unit_of_measure: "Unidade de medida",
  reorder_point: "Ponto de reposição",
  reorder_quantity: "Quantidade de reposição",
  external_reference: "Referência externa",
  current_stock: "Estoque atual",
  lot: "Lote",
  lot_number: "Número do lote",
  expiration_date: "Data de validade",
  received_at: "Recebido em",
  unit_cost: "Custo unitário",
  quantity: "Quantidade",
  reserved_quantity: "Quantidade reservada",
  available_quantity: "Quantidade disponível",
  ordered_quantity: "Quantidade pedida",
  received_quantity: "Quantidade recebida",
  pending_quantity: "Quantidade pendente",
  pending_reservation_quantity: "Quantidade pendente de reserva",
  pending_shipment_quantity: "Quantidade pendente de expedição",
  shipped_quantity: "Quantidade expedida",
  recommended_quantity: "Quantidade recomendada",
  estimated_unit_cost: "Custo unitário estimado",
  counted_quantity: "Quantidade contada",
  system_quantity: "Quantidade no sistema",
  variance: "Diferença",
  movement_type: "Tipo de movimento",
  reference_document: "Documento de referência",
  reason: "Motivo",
  posted_at: "Lançado em",
  order_number: "Número do pedido",
  supplier_name: "Fornecedor",
  supplier_document: "Documento do fornecedor",
  ordered_at: "Pedido em",
  expected_at: "Previsão de recebimento",
  purchase_order: "Pedido de compra",
  purchase_order_line: "Linha do pedido de compra",
  receipt: "Recebimento",
  receipt_number: "Número do recebimento",
  plan: "Plano de reposição",
  plan_number: "Número do plano",
  generated_at: "Gerado em",
  purchase_order_number: "Número do pedido de compra",
  customer_name: "Cliente",
  customer_document: "Documento do cliente",
  customer_reference: "Referência do cliente",
  requested_ship_date: "Data solicitada de expedição",
  priority: "Prioridade",
  sales_order: "Pedido de venda",
  sales_order_line: "Linha do pedido de venda",
  reservation: "Reserva",
  pick_list: "Lista de separação",
  pick_number: "Número da separação",
  quantity_to_pick: "Quantidade a separar",
  quantity_picked: "Quantidade separada",
  shipment: "Expedição",
  shipment_number: "Número da expedição",
  carrier_name: "Transportadora",
  tracking_number: "Código de rastreio",
  transfer: "Transferência",
  transfer_number: "Número da transferência",
  cycle_count: "Inventário cíclico",
  count_number: "Número do inventário",
  counted_at: "Contado em",
}

const WAREHOUSE_LABELS: Record<string, LabelsByField> = {
  warehouse: {
    name: "Nome do armazém",
    code: "Código do armazém",
    status: "Estado do armazém",
  },
  storage_location: {
    name: "Nome da localização",
    code: "Código da localização",
    status: "Estado da localização",
  },
  item_category: {
    name: "Nome da categoria",
    code: "Código da categoria",
    status: "Estado da categoria",
  },
  item: {
    name: "Nome do item",
    status: "Estado do item",
  },
  lot: {
    status: "Estado do lote",
  },
  stock_movement: {
    name: "Descrição do movimento",
    status: "Estado do movimento",
  },
  purchase_order: {
    name: "Nome do pedido de compra",
    status: "Estado do pedido",
  },
  goods_receipt: {
    name: "Nome do recebimento",
  },
  replenishment_plan: {
    name: "Nome do plano de reposição",
  },
  sales_order: {
    name: "Nome do pedido de venda",
    status: "Estado do pedido",
  },
  stock_reservation: {
    status: "Estado da reserva",
  },
  pick_list: {
    name: "Nome da lista de separação",
  },
  shipment: {
    name: "Nome da expedição",
  },
  stock_transfer: {
    name: "Nome da transferência",
  },
  cycle_count: {
    name: "Nome do inventário",
  },
}

function normalizeEndpoint(endpoint?: string): string {
  const raw = String(endpoint || "")
  return raw.split("?")[0].split("#")[0]
}

export function bloodbankResourceKeyFromEndpoint(endpoint?: string): string | null {
  const e = normalizeEndpoint(endpoint)
  // Matches both collection and detail endpoints:
  // - /bloodbank/storage/
  // - /bloodbank/storage/123/
  const m = e.match(/\/bloodbank\/([^/]+)(?:\/|$)/)
  return m?.[1] || null
}

export function warehouseResourceKeyFromEndpoint(endpoint?: string): string | null {
  const e = normalizeEndpoint(endpoint)
  const m = e.match(/\/warehouse\/([^/]+)(?:\/|$)/)
  return m?.[1] || null
}

export function isInternalField(name: string): boolean {
  return INTERNAL_FIELDS.has(String(name || ""))
}

function humanizeSnakeCase(name: string): string {
  const s = String(name || "").trim()
  if (!s) return ""
  const parts = s.split("_").filter(Boolean)
  const words = parts.map((p) => {
    if (p === "id") return "ID"
    if (p === "ml") return "mL"
    if (p === "c") return "°C"
    return p
  })
  const title = words
    .map((w) => (w.length ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ")
  return title || s
}

export function fieldLabel(opts: {
  endpoint?: string
  name: string
  title?: string
}): string {
  const name = String(opts.name || "")
  const title = typeof opts.title === "string" ? opts.title.trim() : ""

  const resourceKey = bloodbankResourceKeyFromEndpoint(opts.endpoint)
  if (resourceKey && BLOODBANK_LABELS[resourceKey]?.[name]) {
    return BLOODBANK_LABELS[resourceKey][name]
  }

  const warehouseKey = warehouseResourceKeyFromEndpoint(opts.endpoint)
  if (warehouseKey) {
    const specific = WAREHOUSE_LABELS[warehouseKey]?.[name]
    if (specific) return specific
    if (WAREHOUSE_COMMON_LABELS[name]) return WAREHOUSE_COMMON_LABELS[name]
  }

  const educationKey = educationResourceKeyFromEndpoint(opts.endpoint)
  if (educationKey && EDUCATION_LABELS[educationKey]?.[name]) {
    return EDUCATION_LABELS[educationKey][name]
  }

  if (COMMON_LABELS[name]) return COMMON_LABELS[name]

  // If OpenAPI provides a real label, prefer it.
  if (title && title.toLowerCase() !== name.toLowerCase()) return title

  return humanizeSnakeCase(name)
}
