import os
from cryptography.fernet import Fernet
from django.core.exceptions import ImproperlyConfigured


CHAVE = os.getenv("FERNET_KEY")

if not CHAVE:
    raise ImproperlyConfigured("FERNET_KEY não definida.")

fernet = Fernet(CHAVE.encode())


def criptografar(texto: str) -> str:
    return fernet.encrypt(texto.encode()).decode()


def descriptografar(texto: str) -> str:
    return fernet.decrypt(texto.encode()).decode()
