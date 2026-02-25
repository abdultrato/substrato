from django.http import JsonResponse
from .modelos.transacao import Transacao

def webhook_confirmacao(request):
    referencia = request.POST.get("referencia")

    transacao = Transacao.objects.get(
        referencia_externa=referencia
    )

    transacao.status = "confirmado"
    transacao.save()

    return JsonResponse({"status": "ok"})
