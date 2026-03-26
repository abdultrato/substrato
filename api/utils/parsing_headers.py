def get_header(request, name, default=None):
    meta_name = f"HTTP_{name.upper().replace('-', '_')}"
    return request.META.get(meta_name, default)


def parse_bearer_token(request):
    authorization = get_header(request, "Authorization", "")
    if not authorization or not authorization.lower().startswith("bearer "):
        return None
    return authorization.split(" ", 1)[1].strip() or None
