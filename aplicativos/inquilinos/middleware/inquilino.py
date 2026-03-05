def __call__(self, request) :
	# ---------------------------------
	# BYPASS TOTAL EM DESENVOLVIMENTO
	# ---------------------------------
	if settings.DEBUG :
		return self.get_response(request)
	
	host = request.get_host().split(":")[0].lower().strip()
	
	if not host :
		return JsonResponse({"erro" : "Host inválido."}, status = 400)
	
	inquilino = self._resolver_inquilino(host)
	
	token = set_inquilino(inquilino)
	request.inquilino = inquilino
	
	try :
		if not inquilino :
			return JsonResponse({"erro" : "Tenant não encontrado."}, status = 404)
		
		if not inquilino.ativo :
			return JsonResponse({"erro" : "Tenant inativo."}, status = 403)
		
		if inquilino.esta_bloqueado() :
			return JsonResponse({"erro" : "Tenant bloqueado ou inadimplente."}, status = 403, )
		
		return self.get_response(request)
	
	finally :
		reset_inquilino(token)