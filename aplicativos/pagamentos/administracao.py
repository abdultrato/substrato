from django.contrib import admin
from .modelos.pagamento import Pagamento
from .modelos.transacao import Transacao
from .modelos.recibo import Recibo

admin.site.register(Pagamento)
admin.site.register(Transacao)
admin.site.register(Recibo)
