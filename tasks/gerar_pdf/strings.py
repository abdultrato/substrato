import re
import unicodedata


def somente_numeros(valor: str | None):
    if not valor:
        return valor
    return re.sub(r"\D", "", valor)


def normalizar_texto(valor: str | None):
    if not valor:
        return valor
    return unicodedata.normalize("NFKD", valor).encode("ascii", "ignore").decode("ascii")


def slugify_simples(texto: str):
    texto = normalizar_texto(texto).lower()
    texto = re.sub(r"[^a-z0-9]+", "-", texto)
    return texto.strip("-")


def capitalizar_nome(nome: str | None):
    if not nome:
        return nome
    return " ".join(p.capitalize() for p in nome.split())
