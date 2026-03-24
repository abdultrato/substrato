import re


def clean_text(text: str) -> str:
    if not text:
        return ""
    return re.sub(r"[<>]", "", text)


limpar_texto = clean_text
