def resolve_rule(rules, exam_code=None, diagnosis_code=None):

    for rule in rules:
        if rule.codigo_exame == exam_code and rule.cid == diagnosis_code:
            return rule

    for rule in rules:
        if rule.codigo_exame == exam_code and rule.cid is None:
            return rule

    for rule in rules:
        if rule.cid == diagnosis_code and rule.codigo_exame is None:
            return rule

    return None


resolver_regra = resolve_rule
