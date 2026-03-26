import re


def compact_whitespace(value):
    return re.sub(r"\s+", " ", str(value or "")).strip()


def truncate(value, limit, suffix="..."):
    text = str(value or "")
    if len(text) <= limit:
        return text
    if limit <= len(suffix):
        return suffix[:limit]
    return text[: limit - len(suffix)].rstrip() + suffix
