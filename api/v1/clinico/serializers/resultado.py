from django.utils import timezone
from rest_framework.serializers import ModelSerializer as ms

from frontend.billing.models.resultado_analise import ResultadoItem as rsi


class ResultadoItemSerializer(ms):
    class Meta:
        model = rsi
        fields = "__all__"

    def update(self, instance, validated_data):
        instance.resultado = validated_data.get("resultado", instance.resultado)
        request = self.context.get("request")
        user = getattr(request, "user", None)

        if instance.resultado not in (None, "", " "):
            instance.validado = True
            instance.data_validacao = timezone.now()
            if user and user.is_authenticated:
                instance.validado_por = user
        else:
            instance.validado = False
            instance.data_validacao = None
            instance.validado_por = None

        instance.save(update_fields=["resultado", "validado", "validado_por", "data_validacao"])
        return instance
