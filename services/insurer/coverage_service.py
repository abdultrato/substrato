from domain.insurer.coverage_engine import resolver_regra as resolve_rule


class CoverageService:
    @staticmethod
    def resolve(plan, exam_code=None, diagnosis_code=None):
        rules = plan.regras.filter(active=True)
        rule = resolve_rule(rules, exam_code, diagnosis_code)

        if not rule:
            return {
                "percentual": plan.coverage_percentage,
                "requires_authorization": plan.requires_authorization,
            }

        return {
            "percentual": rule.coverage_percentage or plan.coverage_percentage,
            "requires_authorization": rule.requires_authorization,
        }


ServicoCobertura = CoverageService
CoverageService.resolver = CoverageService.resolve
