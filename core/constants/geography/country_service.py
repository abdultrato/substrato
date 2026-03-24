import pycountry


def listar_paises_iso():
    """
    Retorna lista de tuplas (codigo_iso, nome_oficial)
    """
    return sorted(
        [(pais.alpha_2, pais.name) for pais in pycountry.countries],
        key=lambda x: x[1],
    )


def obter_nome_pais(codigo_iso):
    try:
        pais = pycountry.countries.get(alpha_2=codigo_iso.upper())
        return pais.name if pais else None
    except Exception:
        return None
