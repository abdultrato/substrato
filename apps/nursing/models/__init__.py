from .nursing_evolution import NursingEvolution
from .nursing_prescription import NursingPrescription
from .nursing_record import NursingRecord
from .procedure import Procedure
from .procedure_catalog import ProcedureCatalog
from .procedure_catalog_material import ProcedureCatalogMaterial
from .procedure_item import ProcedureItem
from .procedure_item_value import ProcedureItemValue
from .procedure_material import ProcedureMaterial
from .procedure_material_value import ProcedureMaterialValue
from .vital_sign import NursingVitalSign
from .ward import Ward, WardAdmission, WardBed

EvolucaoEnfermagem = NursingEvolution
PrescricaoEnfermagem = NursingPrescription
RegistroEnfermagem = NursingRecord
SinalVitalEnfermagem = NursingVitalSign
Enfermaria = Ward
CamaEnfermaria = WardBed
InternamentoEnfermaria = WardAdmission
Procedimento = Procedure
ProcedimentoCatalogo = ProcedureCatalog
ProcedimentoCatalogoMaterial = ProcedureCatalogMaterial
ProcedimentoItem = ProcedureItem
ProcedimentoItemValor = ProcedureItemValue
ProcedimentoMaterial = ProcedureMaterial
ProcedimentoMaterialValor = ProcedureMaterialValue

__all__ = [
    "CamaEnfermaria",
    "Enfermaria",
    "EvolucaoEnfermagem",
    "InternamentoEnfermaria",
    "NursingEvolution",
    "NursingPrescription",
    "NursingRecord",
    "NursingVitalSign",
    "PrescricaoEnfermagem",
    "Procedimento",
    "ProcedimentoCatalogo",
    "ProcedimentoCatalogoMaterial",
    "ProcedimentoItem",
    "ProcedimentoItemValor",
    "ProcedimentoMaterial",
    "ProcedimentoMaterialValor",
    "Procedure",
    "ProcedureCatalog",
    "ProcedureCatalogMaterial",
    "ProcedureItem",
    "ProcedureItemValue",
    "ProcedureMaterial",
    "ProcedureMaterialValue",
    "RegistroEnfermagem",
    "SinalVitalEnfermagem",
    "Ward",
    "WardAdmission",
    "WardBed",
]
