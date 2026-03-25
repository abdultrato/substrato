from rest_framework.response import Response


def success(date):
    return Response({"sucesso": True, "dados": date})


def error(message):
    return Response({"sucesso": False, "error": message}, status=400)


sucesso = success
error = error
