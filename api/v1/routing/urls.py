from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .routes import register_routes

router = DefaultRouter()
# Next.js remove a "/" final por padrao. Tornar a "/" opcional evita erros
# em POST/PUT/PATCH (Django nao consegue redirecionar mantendo o body).
router.trailing_slash = "/?"
register_routes(router)

urlpatterns = [
    path("", include(router.urls)),
]
