def resolver_regra(regras, codigo_exame=None, cid=None):

    # Prioridade 1: exame + cid
    for regra in regras:
        if regra.codigo_exame == codigo_exame and regra.cid == cid:
            return regra

    # Prioridade 2: exame
    for regra in regras:
        if regra.codigo_exame == codigo_exame and regra.cid is None:
            return regra

    # Prioridade 3: cid
    for regra in regras:
        if regra.cid == cid and regra.codigo_exame is None:
            return regra

    return None
