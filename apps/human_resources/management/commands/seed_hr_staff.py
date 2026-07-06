"""Seed de Recursos Humanos: profissões, cargos e funcionários por sector.

Cria um quadro de pessoal coerente com todos os sectores do sistema.
Cada cargo tem 2 funcionários com dados completos (RH + conta de utilizador).

Idempotente: reexecutar não duplica (get_or_create por nome/tenant).

    python manage.py seed_hr_staff
"""

from __future__ import annotations

from datetime import date
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from apps.human_resources.models import Employee, JobTitle, Profession

User = get_user_model()

# fmt: off
# (chave, nome da profissão, categoria, salário base MZN, requer licença, entidade, é médico, nível hierárquico, responsabilidades)
PROFESSIONS = [
    ("director_clinico",    "Director Clínico",              "Administração",               Decimal("180000"), True,  "Ordem dos Médicos de Moçambique",     True,  1, "Dirigir toda a actividade clínica da instituição, coordenar departamentos e representar a unidade perante o MISAU."),
    ("director_rh",         "Director de Recursos Humanos",  "Recursos Humanos",            Decimal("130000"), False, "",                                    False, 1, "Planear, coordenar e supervisionar todas as políticas de recursos humanos da instituição."),
    ("gestor_rh",           "Gestor de Recursos Humanos",    "Gestão / Recursos Humanos",   Decimal("65000"),  False, "",                                    False, 2, "Gerir recrutamento, formação, avaliação e retenção de colaboradores."),
    ("tecnico_rh",          "Técnico de Recursos Humanos",   "Recursos Humanos",            Decimal("32000"),  False, "",                                    False, None, "Processar folhas de salário, gerir férias e licenças."),
    ("recepcionista",       "Recepcionista",                 "Atendimento e Recepção",      Decimal("18000"),  False, "",                                    False, None, "Receber e orientar utentes, gerir agendamentos e chamadas."),
    ("medico_geral",        "Médico Clínico Geral",          "Medicina",                    Decimal("120000"), True,  "Ordem dos Médicos de Moçambique",     True,  None, "Consultar, diagnosticar e tratar pacientes na clínica geral."),
    ("medico_especialista", "Médico Especialista",           "Medicina",                    Decimal("160000"), True,  "Ordem dos Médicos de Moçambique",     True,  None, "Prestar cuidados especializados na área de especialidade."),
    ("medico_trabalho",     "Médico do Trabalho",            "Medicina Ocupacional",        Decimal("140000"), True,  "Ordem dos Médicos de Moçambique",     True,  None, "Avaliar saúde ocupacional dos colaboradores, gerir riscos laborais."),
    ("enfermeiro",          "Enfermeiro(a)",                 "Enfermagem",                  Decimal("45000"),  True,  "Ordem dos Enfermeiros de Moçambique", False, None, "Prestar cuidados de enfermagem, administrar medicação e monitorar pacientes."),
    ("enfermeiro_chefe",    "Enfermeiro(a) Chefe",           "Enfermagem",                  Decimal("60000"),  True,  "Ordem dos Enfermeiros de Moçambique", False, 3,    "Coordenar a equipa de enfermagem e gerir escala de serviço."),
    ("tecnico_lab",         "Técnico de Laboratório",        "Laboratório Clínico",         Decimal("38000"),  True,  "MISAU",                               False, None, "Realizar análises clínicas, garantir qualidade dos resultados laboratoriais."),
    ("patologista",         "Patologista Clínico",           "Laboratório Clínico",         Decimal("150000"), True,  "Ordem dos Médicos de Moçambique",     True,  None, "Supervisionar laboratório clínico, interpretar resultados complexos."),
    ("tecnico_sp",          "Técnico de Saúde Pública",      "Saúde Pública",               Decimal("42000"),  False, "",                                    False, None, "Monitorar indicadores de saúde pública e implementar campanhas de prevenção."),
    ("epidemiologista",     "Epidemiologista",               "Saúde Pública",               Decimal("130000"), True,  "MISAU",                               False, None, "Investigar surtos, analisar dados epidemiológicos e elaborar relatórios."),
    ("farmaceutico",        "Farmacêutico(a)",               "Farmácia",                    Decimal("90000"),  True,  "Ordem dos Farmacêuticos",             False, None, "Dispensar medicamentos, gerir stock e garantir uso racional dos fármacos."),
    ("tecnico_farmacia",    "Técnico de Farmácia",           "Farmácia",                    Decimal("35000"),  True,  "MISAU",                               False, None, "Apoiar a dispensação e controlo de medicamentos na farmácia."),
    ("tecnico_radiologia",  "Técnico de Radiologia",         "Imagiologia",                 Decimal("40000"),  True,  "MISAU",                               False, None, "Realizar exames radiológicos e de imagiologia médica."),
    ("tecnico_biosseg",     "Técnico de Biossegurança",      "Biossegurança",               Decimal("40000"),  False, "",                                    False, None, "Implementar procedimentos de biossegurança e gerir resíduos hospitalares."),
    ("contabilista",        "Contabilista",                  "Financeiro e Contabilidade",  Decimal("55000"),  False, "",                                    False, None, "Gerir contabilidade, processar pagamentos e elaborar demonstrações financeiras."),
    ("auxiliar_higiene",    "Auxiliar de Higiene Hospitalar","Serviços Gerais",             Decimal("14000"),  False, "",                                    False, None, "Garantir limpeza e higiene das instalações hospitalares."),
    ("motorista",           "Motorista de Ambulância",       "Transporte",                  Decimal("20000"),  True,  "INATTER (carta de condução)",         False, None, "Conduzir ambulâncias e veículos institucionais."),
    ("seguranca",           "Agente de Segurança",           "Segurança",                   Decimal("16000"),  False, "",                                    False, None, "Controlar acessos e garantir segurança das instalações."),
    ("tecnico_ti",          "Técnico de Informática",        "Tecnologias de Informação",   Decimal("48000"),  False, "",                                    False, None, "Manter sistemas informáticos, redes e suporte técnico."),
    ("nutricionista",       "Nutricionista",                 "Nutrição",                    Decimal("60000"),  True,  "MISAU",                               False, None, "Avaliar estado nutricional dos pacientes e elaborar planos alimentares."),
    ("fisioterapeuta",      "Fisioterapeuta",                "Reabilitação",                Decimal("58000"),  True,  "MISAU",                               False, None, "Realizar fisioterapia e reabilitação motora de pacientes."),
    ("psicologo",           "Psicólogo Clínico",             "Psicologia",                  Decimal("70000"),  True,  "Ordem dos Psicólogos",                False, None, "Prestar apoio psicológico clínico a pacientes e colaboradores."),
    ("assistente_social",   "Assistente Social",             "Serviço Social",              Decimal("38000"),  True,  "MISAU",                               False, None, "Apoiar pacientes e famílias em questões sociais relacionadas com a saúde."),
    ("gestor_qualidade",    "Gestor da Qualidade",           "Gestão da Qualidade",         Decimal("75000"),  False, "",                                    False, 2,    "Implementar e gerir o sistema de gestão da qualidade laboratorial (ISO 15189)."),
    ("medico_cirurgiao",    "Médico Cirurgião",              "Cirurgia",                    Decimal("175000"), True,  "Ordem dos Médicos de Moçambique",     True,  None, "Realizar intervenções cirúrgicas e acompanhar pós-operatório."),
    ("anestesista",         "Médico Anestesiologista",       "Anestesiologia",              Decimal("170000"), True,  "Ordem dos Médicos de Moçambique",     True,  None, "Administrar anestesia e monitorar pacientes em bloco operatório."),
    ("tecnico_esterilizacao","Técnico de Esterilização",     "Esterilização",               Decimal("30000"),  True,  "MISAU",                               False, None, "Esterilizar material cirúrgico e garantir rastreabilidade do processo."),
    ("gestor_farmaceutico", "Gestor Farmacêutico",           "Farmácia",                    Decimal("110000"), True,  "Ordem dos Farmacêuticos",             False, 2,    "Supervisionar farmácia hospitalar, negociar com fornecedores e gerir inventário."),
]

# fmt: on
# (nome completo, género, chave profissão, ano admissão, BI, NUIT, INSS, telefone, data nasc, estado civil, endereço, contacto emergência nome, contacto emergência tel)
EMPLOYEES: list[tuple] = [
    # Director Clínico (2)
    ("Jorge Mucavele Guebuza",       "M", "director_clinico",    2012, "123456789M", "100234567", "INS-123456", "+258 84 111 2001", date(1975, 4, 12), "CASADO",      "Av. Eduardo Mondlane, 45, Maputo",       "Maria Guebuza",      "+258 82 111 2002"),
    ("Fernanda Cossa Mondlane",      "F", "director_clinico",    2015, "234567890F", "100345678", "INS-234567", "+258 82 222 3001", date(1978, 9, 5),  "CASADO",      "Rua Mártires da Machava, 12, Maputo",    "António Mondlane",   "+258 84 222 3002"),
    # Director de RH (2)
    ("Osvaldo Machava Cossa",        "M", "director_rh",         2014, "345678901M", "100456789", "INS-345678", "+258 84 333 4001", date(1972, 7, 22), "CASADO",      "Av. Kim Il Sung, 88, Maputo",            "Beatriz Cossa",      "+258 82 333 4002"),
    ("Perpetua Langa Nhaca",         "F", "director_rh",         2016, "456789012F", "100567890", "INS-456789", "+258 82 444 5001", date(1980, 3, 17), "SOLTEIRO",    "Rua Pereira do Lago, 23, Maputo",        "José Nhaca",         "+258 84 444 5002"),
    # Gestor RH (2)
    ("Custódio Bila Muendane",       "M", "gestor_rh",           2019, "567890123M", "100678901", "INS-567890", "+258 84 555 6001", date(1985, 11, 3), "CASADO",      "Bairro da Polana, Rua 1234, Maputo",     "Helena Muendane",    "+258 82 555 6002"),
    ("Lúcia Nhaca Tembe",            "F", "tecnico_rh",          2021, "678901234F", "100789012", "INS-678901", "+258 82 666 7001", date(1992, 6, 28), "SOLTEIRO",    "Av. das FPLM, 67, Maputo",               "Carlos Tembe",       "+258 84 666 7002"),
    # Técnico RH (2)
    ("Anselmo Chambal Sitoe",        "M", "tecnico_rh",          2020, "789012345M", "100890123", "INS-789012", "+258 84 777 8001", date(1990, 2, 14), "CASADO",      "Rua General Machava, 90, Matola",        "Rosa Sitoe",         "+258 82 777 8002"),
    ("Cristina Macuácua Cuna",       "F", "tecnico_rh",          2022, "890123456F", "100901234", "INS-890123", "+258 82 888 9001", date(1994, 8, 19), "SOLTEIRO",    "Bairro Polana Caniço A, Maputo",         "João Cuna",          "+258 84 888 9002"),
    # Recepcionista (2)
    ("Ana Cumbe Sitoe",              "F", "recepcionista",       2022, "901234567F", "101012345", "INS-901234", "+258 82 999 0001", date(1996, 1, 7),  "SOLTEIRO",    "Rua de Bagamoyo, 34, Maputo",            "Manuel Sitoe",       "+258 84 999 0002"),
    ("Benilde Mahumane",             "F", "recepcionista",       2023, "012345678F", "101123456", "INS-012345", "+258 84 100 1001", date(1998, 5, 30), "SOLTEIRO",    "Av. Samora Machel, 120, Maputo",         "Joana Mahumane",     "+258 82 100 1002"),
    # Médico Geral (2)
    ("Fernando Mondlane Bila",       "M", "medico_geral",        2018, "112345678M", "101234567", "INS-112345", "+258 84 200 2001", date(1982, 3, 25), "CASADO",      "Av. Agostinho Neto, 55, Maputo",         "Sofia Bila",         "+258 82 200 2002"),
    ("Isabel Chissano Muendane",     "F", "medico_geral",        2020, "223456789F", "101345678", "INS-223456", "+258 82 300 3001", date(1985, 10, 12),"CASADO",      "Rua da Resistência, 8, Maputo",          "Tomás Muendane",     "+258 84 300 3002"),
    # Médico Especialista (2)
    ("Alberto Guebuza Nhampossa",    "M", "medico_especialista", 2016, "334567890M", "101456789", "INS-334567", "+258 84 400 4001", date(1976, 6, 18), "CASADO",      "Rua Consiglieri Pedroso, 15, Maputo",   "Felipa Nhampossa",   "+258 82 400 4002"),
    ("Carla Sithole Massango",       "F", "medico_especialista", 2019, "445678901F", "101567890", "INS-445678", "+258 82 500 5001", date(1983, 12, 3), "SOLTEIRO",    "Av. Paul Kruger, 77, Maputo",            "Pedro Massango",     "+258 84 500 5002"),
    # Médico do Trabalho (2)
    ("Carla Mabjaia Langa",          "F", "medico_trabalho",     2019, "556789012F", "101678901", "INS-556789", "+258 84 600 6001", date(1981, 8, 27), "CASADO",      "Rua Dr. Mavalane, 33, Maputo",          "Ricardo Langa",      "+258 82 600 6002"),
    ("Hélio Cossa Chirindza",        "M", "medico_trabalho",     2021, "667890123M", "101789012", "INS-667890", "+258 82 700 7001", date(1984, 4, 9),  "SOLTEIRO",    "Bairro Central, Av. 24 de Julho, Maputo","Ana Chirindza",     "+258 84 700 7002"),
    # Enfermeiro (2)
    ("Joana Tembe Macuácua",         "F", "enfermeiro",          2021, "778901234F", "101890123", "INS-778901", "+258 84 800 8001", date(1993, 2, 15), "SOLTEIRO",    "Rua Comandante Gaivão, 56, Maputo",     "Paulo Macuácua",     "+258 82 800 8002"),
    ("Paulo Macuácua Sumbane",       "M", "enfermeiro",          2022, "889012345M", "101901234", "INS-889012", "+258 82 900 9001", date(1991, 7, 22), "CASADO",      "Av. de Angola, 14, Maputo",              "Filomena Sumbane",   "+258 84 900 9002"),
    # Enfermeiro Chefe (2)
    ("Rosa Chirindza Massingue",     "F", "enfermeiro_chefe",    2015, "990123456F", "102012345", "INS-990123", "+258 84 010 0001", date(1979, 11, 8), "CASADO",      "Rua Flávio Gonçalves, 29, Maputo",      "Silvério Massingue", "+258 82 010 0002"),
    ("Domingos Nhaca Sitoe",         "M", "enfermeiro_chefe",    2017, "001234567M", "102123456", "INS-001234", "+258 82 020 0001", date(1977, 5, 30), "CASADO",      "Av. Vladimir Lenine, 102, Maputo",       "Conceição Sitoe",    "+258 84 020 0002"),
    # Técnico de Laboratório (2)
    ("Silvério Nhampossa Cuna",      "M", "tecnico_lab",         2020, "112345670M", "102234567", "INS-112346", "+258 84 030 0001", date(1988, 9, 14), "SOLTEIRO",    "Bairro Maxaquene C, Maputo",             "Amélia Cuna",        "+258 82 030 0002"),
    ("Amélia Cossa Chambal",         "F", "tecnico_lab",         2023, "223456781F", "102345678", "INS-223457", "+258 82 040 0001", date(1995, 3, 21), "SOLTEIRO",    "Rua da Munhava, 45, Beira",              "Elias Chambal",      "+258 84 040 0002"),
    # Patologista (2)
    ("Manuel Langa Mucavele",        "M", "patologista",         2014, "334567892M", "102456789", "INS-334568", "+258 84 050 0001", date(1973, 1, 16), "CASADO",      "Av. Mártires da Revolução, 78, Maputo", "Lurdes Mucavele",    "+258 82 050 0002"),
    ("Celeste Muianga Nhabinde",     "F", "patologista",         2018, "445678903F", "102567890", "INS-445679", "+258 82 060 0001", date(1979, 7, 4),  "CASADO",      "Rua Mateus Sansão Muthemba, 12, Maputo","Paulo Nhabinde",    "+258 84 060 0002"),
    # Técnico de Saúde Pública (2)
    ("Hélder Muianga Zandamela",     "M", "tecnico_sp",          2021, "556789014M", "102678901", "INS-556790", "+258 84 070 0001", date(1989, 4, 18), "SOLTEIRO",    "Rua do Jardim, 67, Maputo",              "Teresa Zandamela",   "+258 82 070 0002"),
    ("Sónia Bila Massango",          "F", "tecnico_sp",          2022, "667890125F", "102789012", "INS-667891", "+258 82 080 0001", date(1993, 10, 7), "SOLTEIRO",    "Av. Acordos de Lusaka, 34, Maputo",     "Carlos Massango",    "+258 84 080 0002"),
    # Epidemiologista (2)
    ("Teresa Sitole Nhabinde",       "F", "epidemiologista",     2017, "778901236F", "102890123", "INS-778902", "+258 84 090 0001", date(1980, 6, 29), "CASADO",      "Rua Pereira do Lago, 89, Maputo",       "Henrique Nhabinde",  "+258 82 090 0002"),
    ("Augusto Cossa Tembe",          "M", "epidemiologista",     2019, "889012347M", "102901234", "INS-889013", "+258 82 100 1101", date(1977, 2, 11), "CASADO",      "Av. Filipe Samuel Magaia, 56, Maputo",  "Alzira Tembe",       "+258 84 100 1102"),
    # Farmacêutico (2)
    ("Cláudio Matsinhe Bila",        "M", "farmaceutico",        2018, "990123458M", "103012345", "INS-990124", "+258 84 110 1001", date(1984, 8, 6),  "CASADO",      "Rua dos Desportistas, 23, Maputo",      "Natália Bila",       "+258 82 110 1002"),
    ("Esperança Nhaca Chirindza",    "F", "farmaceutico",        2021, "001234569F", "103123456", "INS-001235", "+258 82 120 1001", date(1988, 12, 24),"SOLTEIRO",    "Bairro Aeroporto, Maputo",               "Deocleciano Chirindza","+258 84 120 1002"),
    # Técnico de Farmácia (2)
    ("Ivone Chambal Cuna",           "F", "tecnico_farmacia",    2022, "112345671F", "103234567", "INS-112347", "+258 84 130 1001", date(1994, 5, 13), "SOLTEIRO",    "Rua da Malhangalene, 45, Maputo",       "Edmundo Cuna",       "+258 82 130 1002"),
    ("Filipe Sumbane Macuácua",      "M", "tecnico_farmacia",    2023, "223456782M", "103345678", "INS-223458", "+258 82 140 1001", date(1997, 9, 2),  "SOLTEIRO",    "Av. Albert Lithuli, 78, Maputo",         "Ana Macuácua",       "+258 84 140 1002"),
    # Técnico de Radiologia (2)
    ("Gerson Bila Massango",         "M", "tecnico_radiologia",  2020, "334567893M", "103456789", "INS-334569", "+258 84 150 1001", date(1987, 3, 27), "CASADO",      "Rua Tenente Valadim, 12, Maputo",       "Deolinda Massango",  "+258 82 150 1002"),
    ("Gracinda Nhampossa Cossa",     "F", "tecnico_radiologia",  2022, "445678904F", "103567890", "INS-445680", "+258 82 160 1001", date(1992, 11, 15),"SOLTEIRO",    "Bairro do Hulene, Maputo",               "Manuel Cossa",       "+258 84 160 1002"),
    # Técnico de Biossegurança (2)
    ("Nelson Zandamela Cossa",       "M", "tecnico_biosseg",     2021, "556789015M", "103678901", "INS-556791", "+258 84 170 1001", date(1990, 7, 8),  "SOLTEIRO",    "Rua Acordos de Lusaka, 89, Maputo",     "Fátima Cossa",       "+258 82 170 1002"),
    ("Cremilda Muianga Sitoe",       "F", "tecnico_biosseg",     2022, "667890126F", "103789012", "INS-667892", "+258 82 180 1001", date(1993, 1, 19), "SOLTEIRO",    "Av. Zedequias Manganhela, 34, Maputo",  "António Sitoe",      "+258 84 180 1002"),
    # Contabilista (2)
    ("Márcia Nhantumbo Sitoe",       "F", "contabilista",        2019, "778901237F", "103890123", "INS-778903", "+258 84 190 1001", date(1986, 5, 14), "CASADO",      "Rua da Mesquita, 56, Maputo",           "Luís Sitoe",         "+258 82 190 1002"),
    ("Celestino Cuna Mabunda",       "M", "contabilista",        2020, "889012348M", "103901234", "INS-889014", "+258 82 200 2001", date(1983, 9, 3),  "CASADO",      "Rua das Rosas, 67, Maputo",             "Graça Mabunda",      "+258 84 200 2002"),
    # Auxiliar de Higiene (2)
    ("Felisberta Cuna Mahumane",     "F", "auxiliar_higiene",    2022, "990123459F", "104012345", "INS-990125", "+258 84 210 2001", date(1998, 2, 26), "SOLTEIRO",    "Bairro Laulane, Maputo",                 "Maria Mahumane",     "+258 82 210 2002"),
    ("Justino Massingue Nhaca",      "M", "auxiliar_higiene",    2023, "001234560M", "104123456", "INS-001236", "+258 82 220 2001", date(2000, 6, 10), "SOLTEIRO",    "Rua dos Pioneiros, 45, Matola",          "Paula Nhaca",        "+258 84 220 2002"),
    # Motorista de Ambulância (2)
    ("António Chaúque Bila",         "M", "motorista",           2021, "112345672M", "104234567", "INS-112348", "+258 84 230 2001", date(1985, 4, 17), "CASADO",      "Bairro da Malhangalene, Maputo",         "Engrácia Bila",      "+258 82 230 2002"),
    ("Valentim Mucavele Sumbane",    "M", "motorista",           2022, "223456783M", "104345678", "INS-223459", "+258 82 240 2001", date(1988, 10, 5), "CASADO",      "Av. de Moçambique, 123, Matola",         "Lídia Sumbane",      "+258 84 240 2002"),
    # Agente de Segurança (2)
    ("Bernardo Sumbane Macuácua",    "M", "seguranca",           2020, "334567894M", "104456789", "INS-334570", "+258 84 250 2001", date(1987, 8, 22), "CASADO",      "Rua do Aeroporto, 78, Maputo",           "Amélia Macuácua",    "+258 82 250 2002"),
    ("Dionísio Langa Cossine",       "M", "seguranca",           2021, "445678905M", "104567890", "INS-445681", "+258 82 260 2001", date(1990, 3, 11), "SOLTEIRO",    "Bairro de Mavalane, Maputo",             "Conceição Cossine",  "+258 84 260 2002"),
    # Técnico de Informática (2)
    ("Edson Mabunda Nhaca",          "M", "tecnico_ti",          2021, "556789016M", "104678901", "INS-556792", "+258 84 270 2001", date(1991, 12, 1), "SOLTEIRO",    "Rua Comandante Gika, 34, Maputo",        "Sandra Nhaca",       "+258 82 270 2002"),
    ("Heloise Tembe Chirindza",      "F", "tecnico_ti",          2022, "667890127F", "104789012", "INS-667893", "+258 82 280 2001", date(1994, 6, 18), "SOLTEIRO",    "Av. Samora Machel, 234, Maputo",         "Eduardo Chirindza",  "+258 84 280 2002"),
    # Nutricionista (2)
    ("Sandra Nhaca Chirindza",       "F", "nutricionista",       2022, "778901238F", "104890123", "INS-778904", "+258 84 290 2001", date(1992, 4, 7),  "SOLTEIRO",    "Bairro Polana Caniço B, Maputo",         "Nelson Chirindza",   "+258 82 290 2002"),
    ("Frederico Cossa Muendane",     "M", "nutricionista",       2023, "889012349M", "104901234", "INS-889015", "+258 82 300 3001", date(1995, 9, 24), "SOLTEIRO",    "Rua de Inhambane, 56, Maputo",           "Alice Muendane",     "+258 84 300 3002"),
    # Fisioterapeuta (2)
    ("Dércio Massingue Tembe",       "M", "fisioterapeuta",      2020, "990123450M", "105012345", "INS-990126", "+258 84 310 3001", date(1988, 1, 15), "CASADO",      "Av. Julius Nyerere, 67, Maputo",         "Cremilda Tembe",     "+258 82 310 3002"),
    ("Benedita Nhaca Cossine",       "F", "fisioterapeuta",      2021, "001234561F", "105123456", "INS-001237", "+258 82 320 3001", date(1990, 7, 3),  "SOLTEIRO",    "Rua Brigadeiro Mussa Traore, 89, Maputo","Elias Cossine",     "+258 84 320 3002"),
    # Psicólogo Clínico (2)
    ("Vanessa Nhabinde Cumbe",       "F", "psicologo",           2019, "112345673F", "105234567", "INS-112349", "+258 84 330 3001", date(1985, 11, 21),"CASADO",      "Rua de Inhaca, 23, Maputo",              "Marco Cumbe",        "+258 82 330 3002"),
    ("Luciano Sitoe Mahumane",       "M", "psicologo",           2021, "223456784M", "105345678", "INS-223460", "+258 82 340 3001", date(1982, 3, 9),  "CASADO",      "Av. 25 de Setembro, 45, Maputo",         "Domingas Mahumane",  "+258 84 340 3002"),
    # Assistente Social (2)
    ("Gabriela Cuna Muianga",        "F", "assistente_social",   2021, "334567895F", "105456789", "INS-334571", "+258 84 350 3001", date(1991, 6, 14), "SOLTEIRO",    "Bairro Costa do Sol, Maputo",            "Jacinto Muianga",    "+258 82 350 3002"),
    ("Albertino Massango Bila",      "M", "assistente_social",   2022, "445678906M", "105567890", "INS-445682", "+258 82 360 3001", date(1989, 10, 28),"CASADO",      "Rua Marquês de Pombal, 78, Maputo",     "Lurdes Bila",        "+258 84 360 3002"),
    # Gestor da Qualidade (2)
    ("Deolinda Cossa Nhampossa",     "F", "gestor_qualidade",    2018, "556789017F", "105678901", "INS-556793", "+258 84 370 3001", date(1983, 8, 5),  "CASADO",      "Av. Marginal, 12, Maputo",               "Faustino Nhampossa", "+258 82 370 3002"),
    ("Edmundo Zandamela Langa",      "M", "gestor_qualidade",    2020, "667890128M", "105789012", "INS-667894", "+258 82 380 3001", date(1980, 2, 19), "CASADO",      "Rua da Beira, 34, Maputo",               "Celeste Langa",      "+258 84 380 3002"),
    # Médico Cirurgião (2)
    ("Armindo Nhabinde Tembe",       "M", "medico_cirurgiao",    2013, "778901239M", "105890123", "INS-778905", "+258 84 390 3001", date(1974, 5, 16), "CASADO",      "Rua de Nampula, 89, Maputo",             "Gracinda Tembe",     "+258 82 390 3002"),
    ("Elsa Mucavele Chambal",        "F", "medico_cirurgiao",    2017, "889012340F", "105901234", "INS-889016", "+258 82 400 4001", date(1978, 11, 30),"CASADO",      "Av. Mão Tsé Tung, 56, Maputo",          "Ricardo Chambal",    "+258 84 400 4002"),
    # Médico Anestesiologista (2)
    ("Rogério Bila Cossine",         "M", "anestesista",         2015, "990123451M", "106012345", "INS-990127", "+258 84 410 4001", date(1976, 9, 7),  "CASADO",      "Rua de Sofala, 23, Maputo",              "Deolinda Cossine",   "+258 82 410 4002"),
    ("Filomena Macuácua Nhaca",      "F", "anestesista",         2019, "001234562F", "106123456", "INS-001238", "+258 82 420 4001", date(1981, 1, 24), "CASADO",      "Av. Josina Machel, 45, Maputo",          "Raúl Nhaca",         "+258 84 420 4002"),
    # Técnico de Esterilização (2)
    ("Alfredo Cossine Muendane",     "M", "tecnico_esterilizacao",2021,"112345674M", "106234567", "INS-112350", "+258 84 430 4001", date(1989, 6, 11), "CASADO",      "Bairro da Munhuana, Maputo",             "Sónia Muendane",     "+258 82 430 4002"),
    ("Olívia Chambal Massango",      "F", "tecnico_esterilizacao",2022,"223456785F", "106345678", "INS-223461", "+258 82 440 4001", date(1993, 12, 8), "SOLTEIRO",    "Rua Muthemba, 67, Maputo",               "Custódio Massango",  "+258 84 440 4002"),
    # Gestor Farmacêutico (2)
    ("Inácio Chirindza Sumbane",     "M", "gestor_farmaceutico", 2016, "334567896M", "106456789", "INS-334572", "+258 84 450 4001", date(1977, 4, 3),  "CASADO",      "Av. das Indústrias, 89, Maputo",         "Nazareth Sumbane",   "+258 82 450 4002"),
    ("Jacinta Cuna Mucavele",        "F", "gestor_farmaceutico", 2020, "445678907F", "106567890", "INS-445683", "+258 82 460 4001", date(1982, 8, 21), "CASADO",      "Rua da Unidade, 23, Maputo",             "Domingos Mucavele",  "+258 84 460 4002"),
]


def _slug(name: str) -> str:
    import unicodedata
    normalized = unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode("ascii")
    parts = [p for p in normalized.lower().split() if p]
    if len(parts) >= 2:
        return f"{parts[0]}.{parts[-1]}"
    return parts[0] if parts else "funcionario"


def _email(name: str) -> str:
    return f"{_slug(name)}@clinica.co.mz"


def _username(name: str) -> str:
    return _slug(name)


def _nib(index: int) -> str:
    return f"0001 0001 {index:04d}0 10 1"


class Command(BaseCommand):
    help = "Popula profissões, cargos e funcionários completos por sector (idempotente)."

    def add_arguments(self, parser):
        parser.add_argument("--tenant", type=int, default=None)
        parser.add_argument("--password", default="Substrato2026!", help="Senha dos utilizadores criados.")

    @transaction.atomic
    def handle(self, *args, **options):
        tenant_model = Employee._meta.get_field("tenant").related_model
        if options["tenant"]:
            tenant = tenant_model.objects.filter(pk=options["tenant"]).first()
        else:
            tenant = tenant_model.objects.order_by("pk").first()
        if not tenant:
            raise CommandError("Nenhum tenant encontrado.")

        password = options["password"]
        self.stdout.write(f"Tenant: {tenant} (#{tenant.pk})")

        # ── Profissões + Cargos ──────────────────────────────────────────────
        professions: dict[str, Profession] = {}
        job_titles: dict[str, JobTitle] = {}
        for key, name, category, salary, requires_license, authority, is_doctor, level, responsibilities in PROFESSIONS:
            profession, p_created = Profession.objects.get_or_create(
                tenant=tenant, name=name,
                defaults={
                    "professional_category": category,
                    "base_salary": salary,
                    "requires_license": requires_license,
                    "license_authority": authority,
                    "active": True,
                    "description": f"Profissão do sector: {category}.",
                },
            )
            professions[key] = profession

            job_title, j_created = JobTitle.objects.get_or_create(
                tenant=tenant, name=name,
                defaults={
                    "description": f"Cargo de {name} ({category}).",
                    "is_doctor": is_doctor,
                    "hierarchy_level": level,
                    "status": JobTitle.Status.ACTIVE,
                    "responsibilities": responsibilities,
                    "salary_grade": f"N{level}" if level else "N5",
                },
            )
            job_titles[key] = job_title
            flag = "+" if (p_created or j_created) else "="
            self.stdout.write(f"  {flag} {name}")

        # ── Funcionários + Users ─────────────────────────────────────────────
        emp_created = 0
        user_created = 0
        for i, row in enumerate(EMPLOYEES, start=1):
            (full_name, gender, prof_key, year,
             doc_number, nuit, inss, phone,
             dob, marital, address,
             emerg_name, emerg_phone) = row

            profession = professions[prof_key]
            job_title  = job_titles[prof_key]
            email      = _email(full_name)
            username   = _username(full_name)

            # User
            user, u_created = User.objects.get_or_create(
                username=username,
                defaults={
                    "email": email,
                    "first_name": full_name.split()[0],
                    "last_name": " ".join(full_name.split()[1:]),
                    "is_active": True,
                    "tenant": tenant,
                },
            )
            if u_created:
                user.set_password(password)
                user.save(update_fields=["password"])
                user_created += 1
            elif not getattr(user, "tenant_id", None):
                user.tenant = tenant
                user.save(update_fields=["tenant"])

            # Employee
            employee, e_created = Employee.objects.get_or_create(
                tenant=tenant, name=full_name,
                defaults={
                    "role": job_title,
                    "profession": profession,
                    "gender": Employee.Gender.MALE if gender == "M" else Employee.Gender.FEMALE,
                    "nationality": "Moçambicana",
                    "status": Employee.Status.ACTIVE,
                    "admission_date": date(year, 3, 1),
                    "email": email,
                    "phone": phone,
                    "date_of_birth": dob,
                    "marital_status": marital,
                    "address": address,
                    "document_type": Employee.DocumentType.BI,
                    "document_number": doc_number,
                    "nuit": nuit,
                    "inss_number": inss,
                    "nib": _nib(i),
                    "payment_method": Employee.PaymentMethod.BANK,
                    "emergency_contact_name": emerg_name,
                    "emergency_contact_phone": emerg_phone,
                    "nominal_salary": profession.base_salary,
                },
            )
            flag = "+" if e_created else "="
            u_flag = "+" if u_created else "="
            self.stdout.write(f"  {flag} EMP {u_flag} USR  {full_name} ({profession.name})")
            if e_created:
                emp_created += 1

        self.stdout.write(self.style.SUCCESS(
            f"\nSeed concluído: {len(professions)} profissões/cargos, "
            f"{emp_created} novos funcionários, {user_created} novos utilizadores "
            f"(de {len(EMPLOYEES)} total)."
        ))
