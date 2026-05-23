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
    case "reception":
      return [GROUPS.ADMIN, GROUPS.RECEPCAO]
    case "billing":
      return [GROUPS.ADMIN, GROUPS.RECEPCAO, GROUPS.CONTABILIDADE]
    case "nursing":
      return [GROUPS.ADMIN, GROUPS.ENFERMAGEM]
    case "equipment":
      return [GROUPS.ADMIN, GROUPS.MANUTENCAO]
    case "human_resources":
      return [GROUPS.ADMIN, GROUPS.RECURSOS_HUMANOS]
    case "pharmacy":
      return [GROUPS.ADMIN, GROUPS.FARMACIA]
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
      return [GROUPS.ADMIN, GROUPS.MEDICINA, GROUPS.MEDICINA_OCUPACIONAL]
    case "consultations":
      return [GROUPS.ADMIN, GROUPS.RECEPCAO, GROUPS.MEDICINA, GROUPS.MEDICINA_OCUPACIONAL]
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
