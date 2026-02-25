def validar_idade(data_nascimento):
    from datetime import date

    idade = date.today().year - data_nascimento.year
    if idade < 0:
        raise ValueError("Data de nascimento inválida")

    return idade
