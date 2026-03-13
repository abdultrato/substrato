from django.conf import settings
from django.core.cache import cache
from django.http import JsonResponse

from aplicativos.inquilinos.modelos.inquilino import Inquilino
from infrastrutura.contexto.inquilino import (reset_inquilino, set_inquilino, )


class InquilinoMiddleware :
	CACHE_TIMEOUT = 60 * 10
	
	def __init__(self, get_response) :
		self.get_response = get_response
	
	# =====================================================
	
	def __call__(self, request) :
		# ---------------------------------
		# DESENVOLVIMENTO (DEBUG)
		# ---------------------------------
		# Em DEBUG, ainda precisamos definir um tenant na thread-local para permitir
		# criação/validação de modelos que exigem `inquilino` via InquilinoMixin.
		# Caso não exista nenhum tenant no banco, cria um tenant local (somente DEBUG).
		if settings.DEBUG :
			host = ""
			try :
				host = request.get_host().split(":")[0].lower().strip()
			except Exception :
				host = ""
			
			inquilino = None
			
			if host :
				inquilino = (Inquilino.objects.filter(dominio = host).order_by("id").first())
			
			if not inquilino :
				inquilino = (Inquilino.objects.filter(ativo = True).order_by("id").first())
			
			if not inquilino :
				# Tenant mínimo para desenvolvimento local.
				try :
					inquilino = Inquilino.objects.create(
							nome = "Tenant Local",
							identificador = "local",
							dominio = host or "localhost",
							ativo = True,
							status_comercial = Inquilino.StatusComercial.TRIAL,
							)
				except Exception :
					# Fallback para corrida/conflito de unique.
					inquilino = (Inquilino.objects.filter(identificador = "local").order_by("id").first())
			
			token = set_inquilino(inquilino)
			request.inquilino = inquilino
			
			try :
				return self.get_response(request)
			finally :
				reset_inquilino(token)
		
		host = request.get_host().split(":")[0].lower().strip()
		
		if not host :
			return JsonResponse({"erro" : "Host inválido."}, status = 400)
		
		inquilino = self._resolver_inquilino(host)

		# Integrações de equipamentos (machine-to-machine) podem autenticar tenant via
		# API key, sem depender do domínio do Host.
		if not inquilino and request.path.startswith("/api/v1/integracoes/equipamentos/") :
			try :
				from aplicativos.integracoes_equipamentos.modelos.credencial import (IntegracaoCredencial, )

				raw_key = (request.headers.get("X-Integration-Key") or request.META.get("HTTP_X_INTEGRATION_KEY") or "").strip()
				cred = IntegracaoCredencial.validar_chave(raw_key)
				if cred and getattr(cred, "equipamento_id", None) :
					inquilino = cred.equipamento.inquilino
			except Exception :
				# Se falhar, segue sem tenant; a view retornará 401.
				inquilino = None
		
		token = set_inquilino(inquilino)
		request.inquilino = inquilino
		
		try :
			if not inquilino :
				# Para integrações de equipamentos, deixamos a view tratar autenticação
				# (retornando 401/403 conforme credencial).
				if request.path.startswith("/api/v1/integracoes/equipamentos/") :
					return self.get_response(request)
				return JsonResponse({"erro" : "Tenant não encontrado."}, status = 404)
			
			if not inquilino.ativo :
				return JsonResponse({"erro" : "Tenant inativo."}, status = 403)
			
			if inquilino.esta_bloqueado() :
				return JsonResponse({"erro" : "Tenant bloqueado ou inadimplente."}, status = 403, )
			
			return self.get_response(request)
		
		finally :
			reset_inquilino(token)
	
	# =====================================================
	
	def _resolver_inquilino(self, host) :
		cache_key = f"tenant_domain:{host}"
		
		tenant_id = cache.get(cache_key)
		
		if tenant_id :
			inquilino = (Inquilino.objects.only("id", "ativo").filter(id = tenant_id, ativo = True).first())
			
			if inquilino :
				return inquilino
			
			cache.delete(cache_key)
		
		inquilino = (Inquilino.objects.only("id", "ativo").filter(dominio = host, ativo = True).first())
		
		if inquilino :
			cache.set(cache_key, inquilino.id, self.CACHE_TIMEOUT)
		
		return inquilino
