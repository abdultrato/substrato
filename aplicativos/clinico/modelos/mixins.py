from django.db import models as m


# =========================================================
# NOME PADRONIZADO
# =========================================================
class NomeMixin(m.Model):
    """
    Campo nome corporativo padronizado.

    ✔ remove espaços extras
    ✔ capitalização consistente
    ✔ indexado para busca rápida
    """

    nome = m.CharField(max_length=120, db_index=True)

    class Meta:
        abstract = True

    def save(self, *args, **kwargs):
        if self.nome:
            self.nome = self.nome.strip().title()
        super().save(*args, **kwargs)

    def __str__(self):
        return self.nome or ""


# =========================================================
# CÓDIGO CORPORATIVO
# =========================================================
class CodigoMixin(m.Model):
    """
    Código identificador corporativo.

    ✔ único
    ✔ padronizado em uppercase
    ✔ indexado
    """

    codigo = m.CharField(max_length=30, unique=True, db_index=True)

    class Meta:
        abstract = True

    def save(self, *args, **kwargs):
        if self.codigo:
            self.codigo = self.codigo.strip().upper()
        super().save(*args, **kwargs)


# =========================================================
# DESCRIÇÃO PADRONIZADA
# =========================================================
class DescricaoMixin(m.Model):
    """
    Campo de descrição institucional.

    ✔ remove espaços extras
    ✔ evita textos sujos
    """

    descricao = m.TextField(blank=True, null=True)

    class Meta:
        abstract = True

    def save(self, *args, **kwargs):
        if self.descricao:
            self.descricao = self.descricao.strip()
        super().save(*args, **kwargs)


# =========================================================
# ORDEM / SEQUÊNCIA
# =========================================================
class OrdemMixin(m.Model):
    """
    Define ordenação lógica.

    ✔ usado para layout de laudos
    ✔ ordenação clínica
    """

    ordem = m.PositiveIntegerField(default=1, db_index=True)

    class Meta:
        abstract = True


# =========================================================
# CUSTOM ID AUTOMÁTICO
# =========================================================
class CustomIDSaveMixin(m.Model):
    """
    Gera id_custom automaticamente baseado no prefixo.

    ✔ único
    ✔ sequencial por data
    ✔ seguro para alta concorrência
    """

    class Meta:
        abstract = True

    def save(self, *args, **kwargs):
        if not self.id_custom and getattr(self, "prefixo", None):
            from django.db import transaction
            from django.utils.timezone import now

            with transaction.atomic():
                date_str = now().strftime("%Y%m%d")

                last = (
                    self.__class__.all_objects.select_for_update()
                    .filter(id_custom__startswith=f"{self.prefixo}{date_str}")
                    .order_by("-id_custom")
                    .first()
                )

                seq = int(last.id_custom[-4:]) + 1 if last else 1
                self.id_custom = f"{self.prefixo}{date_str}{seq:04d}"

        super().save(*args, **kwargs)
