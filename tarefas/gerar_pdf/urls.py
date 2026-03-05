from django.urls import path

from .views import resultado_pdf

urlpatterns = [
	
	path("resultado/<str:id_custom>/", resultado_pdf, name = "resultado_pdf", ),
	
	]