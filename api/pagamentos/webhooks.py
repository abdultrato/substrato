from django.http import JsonResponse

from aplicativos.pagamentos.modelos.transacao import Transacao


def webhook_confirmacao(request):

    referencia = request.POST.get("referencia")

    transacao = Transacao.objects.get(referencia_externa=referencia)

    transacao.status = "confirmado"
    transacao.save(update_fields=["status"])

    return JsonResponse({"status": "ok"})
