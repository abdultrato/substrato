from datetime import timedelta

from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from django.utils import timezone
from rest_framework import serializers, status
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from drf_spectacular.utils import OpenApiResponse, extend_schema

from aplicativos.identidade.modelos.password_reset import PasswordResetToken
from aplicativos.notificacoes.modelos.notificacao import Notificacao
from aplicativos.notificacoes.servicos import ServicoNotificacao

User = get_user_model()


def _password_reset_ttl_minutes() -> int:
	ttl = getattr(settings, "PASSWORD_RESET_TOKEN_TTL_MINUTES", 30)
	try:
		ttl_int = int(ttl)
	except Exception:
		ttl_int = 30
	return max(5, ttl_int)


def _password_reset_cutoff():
	return timezone.now() - timedelta(minutes=_password_reset_ttl_minutes())


class PasswordResetRequestSerializer(serializers.Serializer):
	# Aceita username/email para localizar o usuario.
	username = serializers.CharField(required=False, allow_blank=True)
	email = serializers.EmailField(required=False, allow_blank=True)
	telefone = serializers.CharField(required=False, allow_blank=True)
	# Canal opcional; se omitido, tenta enviar para email + whatsapp se existirem.
	canal = serializers.ChoiceField(
		choices=[Notificacao.Canal.EMAIL, Notificacao.Canal.WHATSAPP],
		required=False,
		allow_null=True,
	)

	def validate(self, attrs):
		if not (attrs.get("username") or attrs.get("email") or attrs.get("telefone")):
			raise serializers.ValidationError(
				"Informe pelo menos um: username, email ou telefone."
			)
		return attrs


class PasswordResetConfirmSerializer(serializers.Serializer):
	token = serializers.CharField()
	new_password = serializers.CharField(trim_whitespace=False)


class PasswordChangeSerializer(serializers.Serializer):
	current_password = serializers.CharField(trim_whitespace=False)
	new_password = serializers.CharField(trim_whitespace=False)


class DetailSerializer(serializers.Serializer):
	detail = serializers.CharField()


class UserMeSerializer(serializers.Serializer):
	id = serializers.IntegerField()
	username = serializers.CharField(required=False, allow_null=True)
	email = serializers.EmailField(required=False, allow_null=True, allow_blank=True)
	telefone = serializers.CharField(required=False, allow_null=True, allow_blank=True)
	first_name = serializers.CharField(required=False, allow_blank=True)
	last_name = serializers.CharField(required=False, allow_blank=True)
	foto_url = serializers.CharField(required=False, allow_null=True, allow_blank=True)
	full_name = serializers.CharField()
	groups = serializers.ListField(child=serializers.CharField(), required=False)


class UserPatchSerializer(serializers.ModelSerializer):
	class Meta:
		model = User
		fields = ("first_name", "last_name", "email", "telefone", "foto")

	def validate_email(self, value):
		# Permitir manter o mesmo email; garantir unicidade case-insensitive.
		if not value:
			return value
		qs = User.objects.filter(email__iexact=value)
		if self.instance:
			qs = qs.exclude(pk=self.instance.pk)
		if qs.exists():
			raise serializers.ValidationError("Este e-mail já está em uso.")
		return value


class LoginView(TokenObtainPairView):
	permission_classes = [AllowAny]


class RefreshView(TokenRefreshView):
	permission_classes = [AllowAny]


class LogoutView(APIView):
	permission_classes = [IsAuthenticated]

	@extend_schema(
		request=None,
		responses={204: OpenApiResponse(description="Logout stateless (JWT).")},
	)
	def post(self, request):
		# Stateless JWT logout: client removes token.
		return Response(status=status.HTTP_204_NO_CONTENT)


class UserView(APIView):
	permission_classes = [IsAuthenticated]
	parser_classes = [JSONParser, FormParser, MultiPartParser]

	@extend_schema(responses={200: UserMeSerializer})
	def get(self, request):
		user = request.user

		full_name = ""
		try:
			full_name = (user.get_full_name() or "").strip()
		except Exception:
			full_name = ""

		groups = []
		try:
			groups = list(user.groups.values_list("name", flat=True))
		except Exception:
			groups = []

		return Response(
			{
				"id": user.id,
				"username": getattr(user, "username", None),
				"email": getattr(user, "email", None),
				"telefone": getattr(user, "telefone", None),
				"first_name": getattr(user, "first_name", ""),
				"last_name": getattr(user, "last_name", ""),
				"foto_url": (
					request.build_absolute_uri(user.foto.url)
					if getattr(user, "foto", None)
					else None
				),
				"full_name": full_name or getattr(user, "username", None),
				"groups": groups,
			}
		)

	@extend_schema(request=UserPatchSerializer, responses={200: UserMeSerializer})
	def patch(self, request):
		user = request.user
		serializer = UserPatchSerializer(instance=user, data=request.data, partial=True)
		serializer.is_valid(raise_exception=True)
		serializer.save()
		return self.get(request)


class PasswordResetRequestView(APIView):
	permission_classes = [AllowAny]

	@extend_schema(request=PasswordResetRequestSerializer, responses={200: DetailSerializer})
	def post(self, request):
		ser = PasswordResetRequestSerializer(data=request.data)
		ser.is_valid(raise_exception=True)
		data = ser.validated_data

		user = None
		if data.get("email"):
			user = User.objects.filter(email__iexact=data["email"]).first()
		elif data.get("username"):
			user = User.objects.filter(username__iexact=data["username"]).first()
		elif data.get("telefone"):
			user = User.objects.filter(telefone=str(data["telefone"])).first()

		# Não revelar se existe ou não.
		if not user:
			return Response(
				{"detail": "Se o utilizador existir, enviaremos instruções para reposição de palavra-passe."},
				status=status.HTTP_200_OK,
			)

		cutoff = _password_reset_cutoff()
		token_obj = (
			PasswordResetToken.objects.filter(user=user, usado=False, criado_em__gte=cutoff)
			.order_by("-criado_em")
			.first()
		)
		if not token_obj:
			token_obj = PasswordResetToken.objects.create(user=user)

		ttl = _password_reset_ttl_minutes()
		mensagem = (
			"Reposição de palavra-passe\n"
			f"Código: {token_obj.token}\n"
			f"Validade: {ttl} minutos."
		)

		canal = data.get("canal")
		canais = []
		if canal:
			canais = [canal]
		else:
			if getattr(user, "email", None):
				canais.append(Notificacao.Canal.EMAIL)
			if getattr(user, "telefone", None):
				canais.append(Notificacao.Canal.WHATSAPP)

		servico = ServicoNotificacao()
		for c in canais:
			destino = user.email if c == Notificacao.Canal.EMAIL else str(user.telefone)
			if not destino:
				continue
			# referência externa evita spam (idempotência por token+canal).
			servico.enviar(
				destino=destino,
				mensagem=mensagem,
				canal=c,
				assunto="Reposição de palavra-passe",
				tipo_evento=getattr(Notificacao.TipoEvento, "PASSWORD_RESET", Notificacao.TipoEvento.GENERICA),
				referencia_externa=f"password_reset:{user.pk}:{token_obj.pk}:{c}",
			)

		return Response(
			{"detail": "Se o utilizador existir, enviaremos instruções para reposição de palavra-passe."},
			status=status.HTTP_200_OK,
		)


class PasswordResetConfirmView(APIView):
	permission_classes = [AllowAny]

	@extend_schema(
		request=PasswordResetConfirmSerializer,
		responses={
			204: OpenApiResponse(description="Senha alterada com sucesso."),
			400: DetailSerializer,
		},
	)
	def post(self, request):
		ser = PasswordResetConfirmSerializer(data=request.data)
		ser.is_valid(raise_exception=True)

		token_str = ser.validated_data["token"]
		new_password = ser.validated_data["new_password"]

		token_obj = (
			PasswordResetToken.objects.select_related("user")
			.filter(token=token_str)
			.order_by("-criado_em")
			.first()
		)
		if not token_obj or token_obj.usado:
			return Response({"detail": "Token inválido ou já usado."}, status=status.HTTP_400_BAD_REQUEST)

		if token_obj.criado_em < _password_reset_cutoff():
			return Response({"detail": "Token expirado."}, status=status.HTTP_400_BAD_REQUEST)

		user = token_obj.user
		try:
			validate_password(new_password, user=user)
		except DjangoValidationError as e:
			msg = " ".join(getattr(e, "messages", [])).strip() or "Palavra-passe inválida."
			return Response({"detail": msg}, status=status.HTTP_400_BAD_REQUEST)
		except Exception:
			return Response({"detail": "Palavra-passe inválida."}, status=status.HTTP_400_BAD_REQUEST)

		with transaction.atomic():
			user.set_password(new_password)
			user.save(update_fields=["password"])

			# Marca o token como usado e invalida tokens antigos do mesmo usuário.
			PasswordResetToken.objects.filter(user=user, usado=False).update(usado=True)

		return Response(status=status.HTTP_204_NO_CONTENT)


class PasswordChangeView(APIView):
	permission_classes = [IsAuthenticated]

	@extend_schema(
		request=PasswordChangeSerializer,
		responses={
			204: OpenApiResponse(description="Senha alterada com sucesso."),
			400: DetailSerializer,
		},
	)
	def post(self, request):
		ser = PasswordChangeSerializer(data=request.data)
		ser.is_valid(raise_exception=True)

		current_password = ser.validated_data["current_password"]
		new_password = ser.validated_data["new_password"]

		user = request.user
		if not user.check_password(current_password):
			return Response(
				{"detail": "A palavra-passe atual está incorreta."},
				status=status.HTTP_400_BAD_REQUEST,
			)

		try:
			validate_password(new_password, user=user)
		except DjangoValidationError as e:
			msg = " ".join(getattr(e, "messages", [])).strip() or "Palavra-passe inválida."
			return Response({"detail": msg}, status=status.HTTP_400_BAD_REQUEST)
		except Exception:
			return Response({"detail": "Palavra-passe inválida."}, status=status.HTTP_400_BAD_REQUEST)

		user.set_password(new_password)
		user.save(update_fields=["password"])
		return Response(status=status.HTTP_204_NO_CONTENT)
