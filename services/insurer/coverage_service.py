from domain.insurer.motor_cobertura import resolver_regra as resolve_rule


class CoverageService:
    @staticmethod
    def resolve(plan, exam_code=None, diagnosis_code=None):
        rules = plan.regras.filter(ativo=True)
        rule = resolve_rule(rules, exam_code, diagnosis_code)

        if not rule:
            return {
                "percentual": plan.percentual_cobertura,
                "exige_autorizacao": plan.exige_autorizacao,
            }

        return {
            "percentual": rule.percentual_cobertura or plan.percentual_cobertura,
            "exige_autorizacao": rule.exige_autorizacao,
        }


ServicoCobertura = CoverageService
CoverageService.resolver = CoverageService.resolve
