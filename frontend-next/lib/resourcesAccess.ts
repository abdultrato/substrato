import { GROUPS } from "@/lib/rbac"
import { canonicalModuleGroupKey } from "@/lib/modules"

export function requiredGroupsForResourceGroup(groupKey: string): string[] {
  switch (canonicalModuleGroupKey(groupKey)) {
    case "clinical":
      return [
        GROUPS.ADMIN,
        GROUPS.RECEPCAO,
        GROUPS.LABORATORIO,
        GROUPS.ENFERMAGEM,
        GROUPS.MEDICINA,
        GROUPS.MEDICINA_OCUPACIONAL,
      ]
    case "clinical_pharmacy":
      return [GROUPS.ADMIN, GROUPS.FARMACIA]
    case "credit_financing":
      return [
        GROUPS.ADMIN,
        GROUPS.RECEPCAO,
        GROUPS.CONTABILIDADE,
        GROUPS.MEDICINA,
        GROUPS.MEDICINA_OCUPACIONAL,
        GROUPS.DIRETOR_ESCOLA,
        GROUPS.DIRETOR_ADJUNTO_PEDAGOGICO,
        GROUPS.CREDITO_FINANCIAMENTO,
      ]
    case "telemedicine":
      return [
        GROUPS.ADMIN,
        GROUPS.RECEPCAO,
        GROUPS.MEDICINA,
        GROUPS.MEDICINA_OCUPACIONAL,
        GROUPS.ENFERMAGEM,
        GROUPS.TELEMEDICINA,
      ]
    case "public_health":
      return [
        GROUPS.ADMIN,
        GROUPS.RECEPCAO,
        GROUPS.MEDICINA,
        GROUPS.MEDICINA_OCUPACIONAL,
        GROUPS.ENFERMAGEM,
        GROUPS.LABORATORIO,
        GROUPS.SAUDE_PUBLICA,
      ]
    case "dental":
      return [GROUPS.ADMIN, GROUPS.RECEPCAO, GROUPS.MEDICINA, GROUPS.MEDICINA_OCUPACIONAL, GROUPS.ODONTOLOGIA]
    case "veterinary":
      return [GROUPS.ADMIN, GROUPS.RECEPCAO, GROUPS.MEDICINA, GROUPS.VETERINARIA]
    case "physiotherapy":
      return [GROUPS.ADMIN, GROUPS.RECEPCAO, GROUPS.MEDICINA, GROUPS.MEDICINA_OCUPACIONAL, GROUPS.FISIOTERAPIA]
    case "pathology":
      return [GROUPS.ADMIN, GROUPS.RECEPCAO, GROUPS.LABORATORIO, GROUPS.MEDICINA, GROUPS.MEDICINA_OCUPACIONAL]
    case "radiology":
      return [GROUPS.ADMIN, GROUPS.RADIOLOGIA]
    case "specialty_diagnostics":
      return [
        GROUPS.ADMIN,
        GROUPS.RECEPCAO,
        GROUPS.MEDICINA,
        GROUPS.MEDICINA_OCUPACIONAL,
        GROUPS.CARDIOLOGIA,
        GROUPS.NEUROLOGIA,
        GROUPS.OFTALMOLOGIA,
      ]
    case "therapy":
      return [
        GROUPS.ADMIN,
        GROUPS.RECEPCAO,
        GROUPS.MEDICINA,
        GROUPS.MEDICINA_OCUPACIONAL,
        GROUPS.FISIOTERAPIA,
        GROUPS.TERAPIA_OCUPACIONAL,
        GROUPS.FONOAUDIOLOGIA,
      ]
    case "transportation":
      return [GROUPS.ADMIN, GROUPS.LOGISTICA, GROUPS.MANUTENCAO, GROUPS.CONTABILIDADE, GROUPS.RECURSOS_HUMANOS]
    case "reception":
      return [GROUPS.ADMIN, GROUPS.RECEPCAO, GROUPS.CONTABILIDADE]
    case "billing":
      return [GROUPS.ADMIN, GROUPS.RECEPCAO, GROUPS.CONTABILIDADE]
    case "cotacoes":
      return [GROUPS.ADMIN, GROUPS.RECEPCAO, GROUPS.CONTABILIDADE, GROUPS.FARMACIA]
    case "nursing":
      return [GROUPS.ADMIN, GROUPS.ENFERMAGEM]
    case "equipment":
      return [GROUPS.ADMIN, GROUPS.MANUTENCAO]
    case "human_resources":
      return [GROUPS.ADMIN, GROUPS.RECURSOS_HUMANOS]
    case "pharmacy":
      return [GROUPS.ADMIN, GROUPS.FARMACIA]
    case "warehouse":
      return [GROUPS.ADMIN, GROUPS.CONTABILIDADE, GROUPS.FARMACIA, GROUPS.RECURSOS_HUMANOS]
    case "bloodbank":
      return [GROUPS.ADMIN, GROUPS.LABORATORIO]
    case "accounting":
      return [GROUPS.ADMIN, GROUPS.CONTABILIDADE]
    case "payments":
      // Pagamentos: contabilidade (auditoria/controle) e recepção (lançamento).
      return [GROUPS.ADMIN, GROUPS.CONTABILIDADE, GROUPS.RECEPCAO]
    case "medical_records":
      return [GROUPS.ADMIN, GROUPS.MEDICINA, GROUPS.MEDICINA_OCUPACIONAL]
    case "maternity":
      return [GROUPS.ADMIN, GROUPS.MEDICINA, GROUPS.MEDICINA_OCUPACIONAL]
    case "surgery":
      return [GROUPS.ADMIN, GROUPS.RECEPCAO, GROUPS.MEDICINA, GROUPS.MEDICINA_OCUPACIONAL]
    case "consultations":
      return [GROUPS.ADMIN, GROUPS.RECEPCAO, GROUPS.MEDICINA]
    case "entities":
      return [GROUPS.ADMIN, GROUPS.RECEPCAO, GROUPS.MEDICINA_OCUPACIONAL]
    case "identity":
      return [
        GROUPS.ADMIN,
        GROUPS.RECURSOS_HUMANOS,
        GROUPS.DIRETOR_ESCOLA,
        GROUPS.DIRETOR_ADJUNTO_PEDAGOGICO,
        GROUPS.PROFESSOR,
      ]
    default:
      return [GROUPS.ADMIN]
  }
}
