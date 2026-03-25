from django.http import JsonResponse

from apps.payments.models.transaction import Transaction


def confirmation_webhook(request):
    external_reference = request.POST.get("referencia")
    transaction = Transaction.objects.get(external_reference=external_reference)
    transaction.status = "confirmed"
    transaction.save(update_fields=["status"])
    return JsonResponse({"status": "ok"})
