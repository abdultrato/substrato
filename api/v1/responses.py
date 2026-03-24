from rest_framework.response import Response


def sucesso(dados):
    return Response({"sucesso": True, "dados": dados})


def erro(mensagem):
    return Response({"sucesso": False, "erro": mensagem}, status=400)
