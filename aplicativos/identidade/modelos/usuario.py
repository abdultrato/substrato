from django.conf import settings
from django.contrib.auth.models import AbstractUser
from django.db import models

from nucleo.modelos import CoreModel
from aplicativos.inquilinos.modelos.inquilino import Inquilino


class Usuario(AbstractUser, CoreModel):
	
	email = models.EmailField(
			unique=True,
			verbose_name="email"
			)
	
	telefone = models.CharField(
			max_length=20,
			blank=True,
			null=True,
			verbose_name="telefone"
			)
	USERNAME_FIELD = "username"
	REQUIRED_FIELDS = ["email"]
	
	class Meta:
		verbose_name = "Usuário"
		verbose_name_plural = "Usuários"
		ordering = ["username"]
	
	def save(self, *args, **kwargs):
		# Política: superuser deve ser exceção (ignora RBAC e atravessa tenants).
		allowlist = set(getattr(settings, "SUPERUSER_ALLOWLIST", []) or [])
		if getattr(self, "is_superuser", False) and (self.username not in allowlist):
			self.is_superuser = False

		# Garantir associação a um inquilino mesmo em ambientes sem contexto (ex.: createsuperuser)
		if not self.inquilino_id:
			tenant = Inquilino.objects.order_by("id").first()
			if tenant:
				self.inquilino = tenant
		super().save(*args, **kwargs)
	
	def __str__(self):
		return self.username
