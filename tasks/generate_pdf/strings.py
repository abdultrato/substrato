import re
import unicodedata


def digits_only(value: str | None):
    if not value:
        return value
    return re.sub(r"\D", "", value)


def normalizar_texto(value: str | None):
    if not value:
        return value
    return unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode("ascii")


def slugify_simples(texto: str):
    texto = normalizar_texto(texto).lower()
    texto = re.sub(r"[^a-z0-9]+", "-", texto)
    return texto.strip("-")


def capitalize_name(name: str | None):
    if not name:
        return name
    return " ".join(p.capitalize() for p in name.split())


somente_numeros = digits_only
capitalizar_name = capitalize_name
