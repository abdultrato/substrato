import { GROUPS } from "@/lib/rbac"
import { canonicalModuleGroupKey } from "@/lib/modules"

export function requiredGroupsForResourceGroup(groupKey: string): string[] {
  switch (canonicalModuleGroupKey(groupKey)) {
    case "enfermagem":
      return [GROUPS.ADMIN, GROUPS.ENFERMAGEM]
    case "recursos_humanos":
      return [GROUPS.ADMIN, GROUPS.RECURSOS_HUMANOS]
    case "farmacia":
      return [GROUPS.ADMIN, GROUPS.FARMACIA]
    case "banco_sangue":
      return [GROUPS.ADMIN, GROUPS.LABORATORIO]
    case "contabilidade":
      return [GROUPS.ADMIN, GROUPS.CONTABILIDADE]
    case "pagamentos":
      // Pagamentos: contabilidade (auditoria/controle) e recepção (lançamento).
      return [GROUPS.ADMIN, GROUPS.CONTABILIDADE, GROUPS.RECEPCAO]
    case "prontuario":
      return [GROUPS.ADMIN, GROUPS.MEDICINA, GROUPS.MEDICINA_OCUPACIONAL]
    case "maternidade":
      return [GROUPS.ADMIN, GROUPS.MEDICINA, GROUPS.MEDICINA_OCUPACIONAL]
    case "cirurgia":
      return [GROUPS.ADMIN, GROUPS.MEDICINA, GROUPS.MEDICINA_OCUPACIONAL]
    case "consultas":
      return [GROUPS.ADMIN, GROUPS.RECEPCAO, GROUPS.MEDICINA, GROUPS.MEDICINA_OCUPACIONAL]
    case "entidades":
      return [GROUPS.ADMIN, GROUPS.RECEPCAO, GROUPS.MEDICINA_OCUPACIONAL]
    default:
      return [GROUPS.ADMIN]
  }
}
