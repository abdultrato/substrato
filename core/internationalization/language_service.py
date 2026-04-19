"""Serviços utilitários para listar e nomear idiomas ISO (pycountry)."""

import pycountry


def list_iso_languages():
    """Retorna choices ISO 639-1 (código, nome) ordenados alfabeticamente."""
    languages = []

    for language in pycountry.languages:
        if hasattr(language, "alpha_2"):
            languages.append((language.alpha_2, language.name))

    return sorted(languages, key=lambda item: item[1])


def get_language_name(iso_code):
    try:
        language = pycountry.languages.get(alpha_2=iso_code)
        return language.name if language else None
    except Exception:
        return None


__all__ = ["get_language_name", "list_iso_languages"]
