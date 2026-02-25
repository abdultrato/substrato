from cryptography.fernet import Fernet

CHAVE = Fernet.generate_key()
fernet = Fernet(CHAVE)

def criptografar(texto: str) -> str:
    return fernet.encrypt(texto.encode()).decode()

def descriptografar(texto: str) -> str:
    return fernet.decrypt(texto.encode()).decode()
