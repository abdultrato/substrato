from django.db import models


class DefaultUnit(models.TextChoices):
    G_DL = "g/dl", "g/dl"
    MG_DL = "mg/dl", "mg/dl"
    MMOL_L = "mmol/l", "mmol/l"
    UMOL_L = "µmol/l", "µmol/l"
    CEL_MM3 = "cel/mm3", "cel/mm3"
    X10_3_UL = "x10³/µl", "x10³/µl"
    X10_6_UL = "x10⁶/µL", "x10⁶/µL"
    PERCENT = "%", "%"
    U_L = "u/l", "u/l"
    P_UL = "p/µL", "p/µL"
    PH = "ph", "ph"
    FL = "fl", "fl"


UnidadePadrao = DefaultUnit
