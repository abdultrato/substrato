from django.contrib import admin

from .modelos.pagamentos import Pagamento
from .modelos.transacao import Transacao
from .modelos.recibo import Recibo
from .modelos.reconciliacao import Reconciliacao


admin.site.register(Pagamento)
admin.site.register(Transacao)
admin.site.register(Recibo)
admin.site.register(Reconciliacao)
