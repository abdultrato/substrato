def anonymize_email(email):
    name, domain = email.split("@")
    return name[0] + "***@" + domain


anonimizar_email = anonymize_email
"""Helpers para anonimização/mascaramento de dados sensíveis."""
