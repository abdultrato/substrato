import re


def limpar_texto(texto: str) -> str:
    if not texto:
        return ""
    return re.sub(r"[<>]", "", texto)
