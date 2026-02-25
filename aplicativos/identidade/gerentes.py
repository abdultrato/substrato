from django.contrib.auth.models import BaseUserManager

class UsuarioManager(BaseUserManager):

    def criar_usuario(self, email, password=None, **extra):
        if not email:
            raise ValueError("Email é obrigatório")

        email = self.normalize_email(email)
        usuario = self.model(email=email, **extra)
        usuario.set_password(password)
        usuario.save()
        return usuario

    def criar_superusuario(self, email, password, **extra):
        extra.setdefault("is_staff", True)
        extra.setdefault("is_superuser", True)
        return self.criar_usuario(email, password, **extra)


