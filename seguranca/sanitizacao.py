import re

def limpar_texto(texto):
    return re.sub(r"[<>]", "", texto)
