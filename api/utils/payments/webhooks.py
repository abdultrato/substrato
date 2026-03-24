from django.http import JsonResponse

from apps.payments.models.transaction import Transaction


def confirmation_webhook(request):
    external_reference = request.POST.get("referencia")
    transaction = Transaction.objects.get(referencia_externa=external_reference)
    transaction.status = "confirmado"
    transaction.save(update_fields=["status"])
    return JsonResponse({"status": "ok"})
