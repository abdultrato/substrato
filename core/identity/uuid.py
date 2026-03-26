from uuid import UUID, uuid4


def generate_uuid() -> str:
    return str(uuid4())


def normalize_uuid(value) -> str:
    return str(UUID(str(value)))


def is_valid_uuid(value) -> bool:
    try:
        normalize_uuid(value)
    except (TypeError, ValueError, AttributeError):
        return False
    return True
