from django.contrib import admin
from .modelos.conta import Conta
from .modelos.lancamento import Lancamento
from .modelos.movimento import Movimento

admin.site.register(Conta)
admin.site.register(Lancamento)
admin.site.register(Movimento)
