from .absence import Absence
from .employee import Employee
from .family_dependent import FamilyDependent
from .job_title import JobTitle
from .overtime import Overtime
from .payroll import Payroll
from .termination import Termination
from .vacation import Vacation
from .work_schedule import WorkSchedule

AgregadoFamiliar = FamilyDependent
Cargo = JobTitle
Dispensa = Termination
Falta = Absence
Ferias = Vacation
FolhaPagamento = Payroll
Funcionario = Employee
HoraExtra = Overtime
HorarioTrabalho = WorkSchedule

__all__ = [
    "AgregadoFamiliar",
    "Absence",
    "Cargo",
    "Dispensa",
    "Employee",
    "Falta",
    "FamilyDependent",
    "Ferias",
    "FolhaPagamento",
    "Funcionario",
    "HoraExtra",
    "HorarioTrabalho",
    "JobTitle",
    "Overtime",
    "Payroll",
    "Termination",
    "Vacation",
    "WorkSchedule",
]
