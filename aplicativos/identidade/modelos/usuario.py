from django.contrib.auth.models import AbstractUser
from django.db import models

from nucleo.modelos import CoreModel


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
	
	def __str__(self):
		return self.username
