import { GROUPS } from "@/lib/rbac"
import { SessionUser } from "@/lib/session"

function normalizeGroupName(value: string): string {
  return (value || "")
    .trim()
    .toLocaleLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
}

function normalizedUserGroups(user: SessionUser | null): string[] {
  return (user?.groups ?? []).map(normalizeGroupName).filter(Boolean)
}

// Grupos com acesso às páginas de requisição de materiais (todos os setores
// solicitantes do Substrato + farmácia, que requisita insumos ao armazém).
export const MATERIAL_REQUISITION_PAGE_GROUPS = [
  GROUPS.ADMIN,
  GROUPS.FARMACIA,
  GROUPS.FARMACIA_CLINICA,
  GROUPS.LABORATORIO,
  GROUPS.ENFERMAGEM,
  GROUPS.RECEPCAO,
  GROUPS.MEDICINA,
  GROUPS.MEDICINA_OCUPACIONAL,
  GROUPS.ODONTOLOGIA,
  GROUPS.VETERINARIA,
  GROUPS.FISIOTERAPIA,
  GROUPS.RADIOLOGIA,
  GROUPS.CARDIOLOGIA,
  GROUPS.NEUROLOGIA,
  GROUPS.OFTALMOLOGIA,
  GROUPS.TERAPIA_OCUPACIONAL,
  GROUPS.FONOAUDIOLOGIA,
  GROUPS.TELEMEDICINA,
  GROUPS.SAUDE_PUBLICA,
  GROUPS.CREDITO_FINANCIAMENTO,
  GROUPS.LOGISTICA,
  GROUPS.MANUTENCAO,
  GROUPS.CONTABILIDADE,
  GROUPS.RECURSOS_HUMANOS,
  GROUPS.PROFESSOR,
  GROUPS.DIRETOR_ESCOLA,
  GROUPS.DIRETOR_ADJUNTO_PEDAGOGICO,
]

// Setores solicitantes (códigos do backend RequestingSector).
export const MATERIAL_REQUISITION_SECTOR_LABELS: Record<string, string> = {
  LAB: "Laboratório",
  ENF: "Enfermagem",
  REC: "Recepção",
  MED: "Medicina",
  MOC: "Medicina Ocupacional",
  FAR: "Farmácia",
  FCL: "Farmácia Clínica",
  ODO: "Odontologia",
  VET: "Medicina Veterinária",
  FIS: "Fisioterapia",
  RAD: "Radiologia",
  CAR: "Cardiologia",
  NEU: "Neurologia",
  OFT: "Oftalmologia",
  TOC: "Terapia Ocupacional",
  FON: "Fonoaudiologia",
  TLM: "Telemedicina",
  SPU: "Saúde Pública",
  CRF: "Créditos e Financiamento",
  LOG: "Logística",
  MAN: "Manutenção",
  CON: "Contabilidade",
  RHU: "Recursos Humanos",
  EDU: "Educação",
  OUT: "Outros setores",
}

export function materialRequisitionSectorLabel(sector?: string | null): string {
  if (!sector) return "—"
  return MATERIAL_REQUISITION_SECTOR_LABELS[sector] || sector
}

export function isMaterialRequisitionPharmacyUser(user: SessionUser | null): boolean {
  if (!user) return false
  if (user.is_superuser) return true

  const groups = new Set(normalizedUserGroups(user))
  return (
    groups.has(normalizeGroupName(GROUPS.ADMIN)) ||
    groups.has(normalizeGroupName(GROUPS.FARMACIA))
  )
}

export function canCreateMaterialRequisition(user: SessionUser | null): boolean {
  if (!user) return false
  if (user.is_superuser) return true

  // Qualquer perfil com grupo pode requisitar: setores clínicos/suporte à
  // farmácia; a própria farmácia (e admin) ao armazém central.
  return normalizedUserGroups(user).length > 0
}
