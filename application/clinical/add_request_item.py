from apps.clinical.models import LabRequestItem
from domain.clinical.request_rules import RequestCalculator


class AddRequestItem:
    @staticmethod
    def execute(request, exam, price, quantity):
        item, _ = LabRequestItem.objects.update_or_create(
            request=request,
            exam=exam,
            defaults={
                "unit_price": price,
                "quantity": quantity,
            },
        )

        total = RequestCalculator.calculate_total(request)

        return item, total
