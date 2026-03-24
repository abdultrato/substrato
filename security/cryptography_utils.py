import os

from cryptography.fernet import Fernet
from django.core.exceptions import ImproperlyConfigured

KEY = os.getenv("FERNET_KEY")

if not KEY:
    raise ImproperlyConfigured("FERNET_KEY não definida.")

fernet = Fernet(KEY.encode())


def encrypt(text: str) -> str:
    return fernet.encrypt(text.encode()).decode()


def decrypt(text: str) -> str:
    return fernet.decrypt(text.encode()).decode()


CHAVE = KEY
criptografar = encrypt
descriptografar = decrypt
