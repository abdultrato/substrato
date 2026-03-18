from datetime import timedelta
import uuid
import os

from django.conf import settings
from django.contrib.auth import logout as django_logout
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.cache import cache
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from django.utils import timezone
from drf_spectacular.utils import OpenApiResponse, extend_schema
from rest_framework import serializers, status
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import AllowAny
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer, TokenRefreshSerializer
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from aplicativos.identidade.modelos.password_reset import PasswordResetToken
from aplicativos.notificacoes.modelos.notificacao import Notificacao
from aplicativos.notificacoes.servicos import ServicoNotificacao
from seguranca.permissoes.rbac import RBACPermission

User = get_user_model()


SESSION_IDLE_TIMEOUT_MINUTES = int(getattr(settings, "SESSION_IDLE_TIMEOUT_MINUTES", 30) or 30)
SESSION_IDLE_TIMEOUT_SECONDS = max(5, SESSION_IDLE_TIMEOUT_MINUTES) * 60
COOKIE_ACCESS_NAME = "access_token"
COOKIE_REFRESH_NAME = "refresh_token"
REFRESH_CACHE_PREFIX = "auth:refresh:"

def _cookie_domain(request):
    # Prioridade: variáveis de ambiente/configuração.
    # Importante: não forçar domínio pelo host da requisição em dev,
    # porque IPs (ex.: 127.0.0.1) podem gerar cookies inválidos em browsers.
    env_domain = os.getenv("AUTH_COOKIE_DOMAIN") or getattr(settings, "SESSION_COOKIE_DOMAIN", None)
    if env_domain:
        return env_domain
    # Em DEV, preferir a origem real do frontend (Origin) quando disponível.
    # Isso evita definir domain=localhost quando a requisição chega via proxy
    # (ex.: Next -> backend), mas o navegador está em outro host/IP.
    if getattr(settings, "DEBUG", False):
        origin = request.META.get("HTTP_ORIGIN") or request.headers.get("Origin")
        if origin:
            try:
                origin_host = origin.split("://", 1)[-1].split("/", 1)[0].split(":")[0].strip()
            except Exception:
                origin_host = ""
            if origin_host in {"localhost", "127.0.0.1"}:
                return "localhost"
            # Para IPs/domínios diferentes, use cookie host-only.
            return None
        host = (request.get_host() or "").split(":")[0].strip()
        if host in {"localhost", "127.0.0.1"}:
            return "localhost"
        return None
    return None


def _set_jwt_cookies(response: Response, request, access: str | None = None, refresh: str | None = None):
    # Usa o esquema real da requisição para decidir o flag Secure;
    # em ambientes behind-proxy, configure SECURE_PROXY_SSL_HEADER.
    secure = request.is_secure()
    samesite = "Lax"
    path = "/"
    domain = _cookie_domain(request)

    if access is not None:
        response.set_cookie(
            COOKIE_ACCESS_NAME,
            access,
            max_age=SESSION_IDLE_TIMEOUT_SECONDS,
            httponly=True,
            secure=secure,
            samesite=samesite,
            path=path,
            domain=domain,
        )
    if refresh is not None:
        response.set_cookie(
            COOKIE_REFRESH_NAME,
            refresh,
            max_age=int(timedelta(days=7).total_seconds()),
            httponly=True,
            secure=secure,
            samesite=samesite,
            path=path,
            domain=domain,
        )


def _clear_jwt_cookies(response: Response):
    for name in (COOKIE_ACCESS_NAME, COOKIE_REFRESH_NAME):
        response.delete_cookie(name, path="/")


def _refresh_cache_key(user_id: int, jti: str) -> str:
    return f"{REFRESH_CACHE_PREFIX}{user_id}:{jti}"


def _allow_refresh(user_id: int, jti: str, lifetime_seconds: int):
    cache.set(_refresh_cache_key(user_id, jti), True, timeout=lifetime_seconds)


def _revoke_refresh(user_id: int, jti: str):
    cache.delete(_refresh_cache_key(user_id, jti))


def _session_cache_key(user_id: int) -> str:
    return f"auth:sid:{user_id}"


def _start_session(user_id: int, session_id: str):
    cache.set(_session_cache_key(user_id), session_id, timeout=SESSION_IDLE_TIMEOUT_SECONDS)


def _touch_session(user_id: int, session_id: str):
    key = _session_cache_key(user_id)
    stored = cache.get(key)
    if stored != session_id:
        return False
    try:
        cache.touch(key, timeout=SESSION_IDLE_TIMEOUT_SECONDS)
    except Exception:
        cache.set(key, session_id, timeout=SESSION_IDLE_TIMEOUT_SECONDS)
    return True


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
            raise serializers.ValidationError("Informe pelo menos um: username, email ou telefone.")
        return attrs


class PasswordResetConfirmSerializer(serializers.Serializer):
    token = serializers.CharField()
    new_password = serializers.CharField(trim_whitespace=False)


class PasswordChangeSerializer(serializers.Serializer):
    current_password = serializers.CharField(trim_whitespace=False)
    new_password = serializers.CharField(trim_whitespace=False)


class DetailSerializer(serializers.Serializer):
    detail = serializers.CharField()


class SessionTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)

        session_id = uuid.uuid4().hex

        refresh = self.get_token(self.user)
        refresh["sid"] = session_id

        # Single-use refresh: registrar jti no cache com TTL do refresh.
        refresh_ttl = int(settings.SIMPLE_JWT["REFRESH_TOKEN_LIFETIME"].total_seconds())
        _allow_refresh(self.user.id, str(refresh.get("jti")), refresh_ttl)

        data["refresh"] = str(refresh)
        data["access"] = str(refresh.access_token)
        data["session_id"] = session_id

        _start_session(self.user.id, session_id)

        return data


class SessionTokenRefreshSerializer(TokenRefreshSerializer):
    def validate(self, attrs):
        refresh_token = attrs.get("refresh")
        if not refresh_token:
            raise AuthenticationFailed("Sessão expirada.")

        refresh = RefreshToken(refresh_token)

        session_id = refresh.get("sid")
        user_id = refresh.get("user_id")

        if not session_id or not user_id:
            raise AuthenticationFailed("Sessão expirada.")

        if not _touch_session(int(user_id), session_id):
            raise AuthenticationFailed("Sessão expirada ou revogada.")

        # Enforce single-use refresh: precisa estar no cache.
        jti = str(refresh.get("jti"))
        key = _refresh_cache_key(int(user_id), jti)
        if not cache.get(key):
            raise AuthenticationFailed("Sessão expirada.")

        # Rotaciona: invalida jti antigo e gera novo refresh com o mesmo sid.
        _revoke_refresh(int(user_id), jti)
        user = User.objects.filter(id=int(user_id)).first()
        if not user:
            raise AuthenticationFailed("Sessão expirada.")
        new_refresh = RefreshToken.for_user(user)
        new_refresh["sid"] = session_id
        refresh_ttl = int(settings.SIMPLE_JWT["REFRESH_TOKEN_LIFETIME"].total_seconds())
        _allow_refresh(int(user_id), str(new_refresh.get("jti")), refresh_ttl)

        data = {
            "access": str(new_refresh.access_token),
            "refresh": str(new_refresh),
            "session_id": session_id,
        }

        return data


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
    serializer_class = SessionTokenObtainPairSerializer
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "login"

    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        access = response.data.get("access")
        refresh = response.data.get("refresh")
        if access or refresh:
            _set_jwt_cookies(response, request, access=access, refresh=refresh)
            # Remover tokens do corpo para evitar exposição ao JS; manter session_id.
            response.data = {"session_id": response.data.get("session_id")}
        return response


class RefreshView(TokenRefreshView):
    permission_classes = [AllowAny]
    serializer_class = SessionTokenRefreshSerializer

    def post(self, request, *args, **kwargs):
        # Se o refresh token não vier no body, tenta cookie HttpOnly.
        if "refresh" not in request.data:
            cookie_refresh = request.COOKIES.get(COOKIE_REFRESH_NAME)
            if cookie_refresh:
                request._full_data = {"refresh": cookie_refresh}

        response = super().post(request, *args, **kwargs)

        access = response.data.get("access")
        refresh = response.data.get("refresh")
        if access or refresh:
            _set_jwt_cookies(response, request, access=access, refresh=refresh)
            response.data = {"session_id": response.data.get("session_id")}
        return response


class LogoutView(APIView):
    permission_classes = [RBACPermission]

    @extend_schema(
        request=None,
        responses={204: OpenApiResponse(description="Logout stateless (JWT).")},
    )
    def post(self, request):
        # Logout unificado: JWT + sessão Django (admin).
        try:
            user_id = request.user.id
            cache.delete(_session_cache_key(user_id))
        except Exception:
            pass

        # Remove sessão Django vinculada ao request, se existir.
        try:
            django_logout(request)
        except Exception:
            pass

        response = Response(status=status.HTTP_204_NO_CONTENT)
        _clear_jwt_cookies(response)
        return response


class UserView(APIView):
    permission_classes = [RBACPermission]
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
                # IMPORTANT:
                # Retorne um path relativo (/media/...) para funcionar tanto:
                # - via proxy do Next.js (localhost:3000 -> backend:8000), onde build_absolute_uri
                #   pode gerar "http://backend:8000/..." (host interno, inacessivel no browser)
                # - quanto diretamente no backend (localhost:8000) e via nginx.
                "foto_url": (user.foto.url if getattr(user, "foto", None) else None),
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
        mensagem = f"Reposição de palavra-passe\nCódigo: {token_obj.token}\nValidade: {ttl} minutos."

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
            PasswordResetToken.objects.select_related("user").filter(token=token_str).order_by("-criado_em").first()
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

            # Revoga sessões JWT ativas (idle cache) após reset de senha.
            cache.delete(_session_cache_key(user.id))

        return Response(status=status.HTTP_204_NO_CONTENT)


class PasswordChangeView(APIView):
    permission_classes = [RBACPermission]

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
