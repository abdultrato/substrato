from rest_framework.response import Response


def success(data=None, message="success"):
    return Response(
        {
            "success": True,
            "message": message,
            "data": data,
        }
    )


def error(message="error", data=None):
    return Response(
        {
            "success": False,
            "message": message,
            "data": data,
        }
    )


def created(data=None, message="Criado com sucesso"):
    return success(data, message, 201)


def deleted(message="Removido com sucesso"):
    return success(None, message, 204)
