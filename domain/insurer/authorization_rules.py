"""Regras para saber se um plano exige autorização prévia."""

def should_request_authorization(plan):
    return plan.requires_authorization


deve_solicitar_autorizacao = should_request_authorization
