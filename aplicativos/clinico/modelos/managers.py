from django.db import models


class ActiveQuerySet(models.QuerySet):
    """
    QuerySet corporativo.

    Permite encadeamento eficiente:
    Model.objects.ativos().order_by(...)
    """

    def ativos(self):
        return self.filter(ativo=True, deletado=False)

    def inativos(self):
        return self.filter(ativo=False, deletado=False)

    def deletados(self):
        return self.filter(deletado=True)

    def com_deletados(self):
        return self.all()


class ActiveManager(models.Manager):
    """
    Manager padrão corporativo.

    ✔ oculta soft-deleted por padrão
    ✔ expõe filtros avançados
    ✔ compatível com ORM chaining
    """

    def get_queryset(self):
        return ActiveQuerySet(self.model, using=self._db).filter(deletado=False)

    # expõe QuerySet methods
    def ativos(self):
        return self.get_queryset().ativos()

    def inativos(self):
        return self.get_queryset().inativos()

    def deletados(self):
        return ActiveQuerySet(self.model, using=self._db).deletados()

    def com_deletados(self):
        return ActiveQuerySet(self.model, using=self._db)
