import hashlib

def gerar_hash(valor: str) -> str:
    return hashlib.sha256(valor.encode()).hexdigest()
