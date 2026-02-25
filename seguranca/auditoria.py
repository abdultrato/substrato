from observabilidade.logs import info

def registrar_acao(usuario, acao):
    info(f"AUDITORIA: {usuario} executou {acao}")
