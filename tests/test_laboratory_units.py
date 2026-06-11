from core.constants.laboratory.units import DefaultUnit


def test_laboratory_unit_catalog_includes_common_biochemistry_units():
    values = set(DefaultUnit.values)

    assert {
        "mg/L",
        "µg/dL",
        "ng/mL",
        "mEq/L",
        "razão/índice",
    }.issubset(values)


def test_laboratory_unit_catalog_includes_common_extended_units():
    values = set(DefaultUnit.values)

    assert {
        "g/L",
        "mg/24h",
        "pg/mL",
        "mmol/mol",
        "mmHg",
        "mOsm/kg",
        "INR",
        "sem unidade",
    }.issubset(values)
