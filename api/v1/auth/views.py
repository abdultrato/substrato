from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView


class LoginView(TokenObtainPairView):
	permission_classes = [AllowAny]


class RefreshView(TokenRefreshView):
	permission_classes = [AllowAny]


class LogoutView(APIView):
	permission_classes = [IsAuthenticated]

	def post(self, request):
		# Stateless JWT logout: client removes token.
		return Response(status=status.HTTP_204_NO_CONTENT)


class UserView(APIView):
	permission_classes = [IsAuthenticated]

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
				"full_name": full_name or getattr(user, "username", None),
				"groups": groups,
			}
		)

