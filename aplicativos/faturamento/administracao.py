from django.contrib import admin
from .modelos.fatura import Fatura
from .modelos.item_fatura import ItemFatura
from .modelos.tabela_precos import TabelaPrecos

admin.site.register(Fatura)
admin.site.register(ItemFatura)
admin.site.register(TabelaPrecos)
