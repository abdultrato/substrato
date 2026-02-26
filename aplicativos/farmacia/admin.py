from django.contrib import admin
from .models.produto import Produto
from .models.lote import Lote
from .models.movimento import MovimentoEstoque
from models.venda import Venda
from .models.item_venda import ItemVenda


admin.site.register(Produto)
admin.site.register(Lote)
admin.site.register(MovimentoEstoque)
admin.site.register(Venda)
admin.site.register(ItemVenda)
