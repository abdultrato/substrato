from rest_framework.response import Response


def success(data):
    return Response({"sucesso": True, "dados": data})


def error(message):
    return Response({"sucesso": False, "erro": message}, status=400)


sucesso = success
erro = error
