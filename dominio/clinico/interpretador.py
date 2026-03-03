# LOCAL: dominio/clinico/interpretador.py

from dataclasses import dataclass


class StatusClinico :
	NORMAL = "normal"
	BAIXO = "baixo"
	ALTO = "alto"
	CRITICO = "critico"


@dataclass(frozen = True)
class IntervaloReferencia :
	minimo: float | None = None
	maximo: float | None = None
	critico_baixo: float | None = None
	critico_alto: float | None = None


def interpretar(valor: float | None, ref: IntervaloReferencia) -> str :
	if valor is None :
		return StatusClinico.NORMAL
	
	if ref.critico_baixo is not None and valor <= ref.critico_baixo :
		return StatusClinico.CRITICO
	
	if ref.critico_alto is not None and valor >= ref.critico_alto :
		return StatusClinico.CRITICO
	
	if ref.minimo is not None and valor < ref.minimo :
		return StatusClinico.BAIXO
	
	if ref.maximo is not None and valor > ref.maximo :
		return StatusClinico.ALTO
	
	return StatusClinico.NORMAL