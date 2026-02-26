from django.contrib.auth.models import BaseUserManager


class UsuarioManager(BaseUserManager):

    def create_user(self, email, password=None, **extra):
        if not email:
            raise ValueError("Email é obrigatório")

        email = self.normalize_email(email)

        user = self.model(email=email, **extra)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password, **extra):
        extra.setdefault("is_staff", True)
        extra.setdefault("is_superuser", True)

        if not extra.get("is_staff"):
            raise ValueError("Superuser precisa is_staff=True")

        if not extra.get("is_superuser"):
            raise ValueError("Superuser precisa is_superuser=True")

        return self.create_user(email, password, **extra)
