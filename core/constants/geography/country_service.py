import pycountry


def list_iso_countries():
    """
    Returns `(iso_code, country_name)` tuples.
    """
    return sorted(
        [(country.alpha_2, country.name) for country in pycountry.countries],
        key=lambda item: item[1],
    )


def get_country_name(iso_code):
    try:
        country = pycountry.countries.get(alpha_2=iso_code.upper())
        return country.name if country else None
    except Exception:
        return None


__all__ = ["get_country_name", "list_iso_countries"]
