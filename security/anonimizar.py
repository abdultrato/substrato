def anonimizar_email(email):
    nome, dominio = email.split("@")
    return nome[0] + "***@" + dominio
