from django.http import JsonResponse

from apps.payments.models.transaction import Transaction


def webhook_confirmacao(request):

    referencia = request.POST.get("referencia")

    transacao = Transaction.objects.get(referencia_externa=referencia)

    transacao.status = "confirmado"
    transacao.save(update_fields=["status"])

    return JsonResponse({"status": "ok"})
