import hashlib


def generate_hash(value: str) -> str:
    return hashlib.sha256(value.encode()).hexdigest()


gerar_hash = generate_hash
