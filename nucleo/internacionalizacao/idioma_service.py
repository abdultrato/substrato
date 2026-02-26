import pycountry


def listar_idiomas_iso():
    """
    Retorna lista de idiomas ISO 639-1 (2 letras).
    """
    idiomas = []

    for idioma in pycountry.languages:
        if hasattr(idioma, "alpha_2"):
            idiomas.append((idioma.alpha_2, idioma.name))

    return sorted(idiomas, key=lambda x: x[1])


def obter_nome_idioma(codigo_iso):
    try:
        idioma = pycountry.languages.get(alpha_2=codigo_iso)
        return idioma.name if idioma else None
    except Exception:
        return None
