"""Blood compatibility rules used by reservation and transfusion flows.

This module implements a conservative compatibility check for the common
components handled by this app:
- WB/RBC: RBC (ABO + Rh) compatibility.
- Plasma/CRY: Plasma (ABO) compatibility; Rh is ignored.
- Platelets: treated like plasma for ABO; Rh is checked like RBC (conservative).

If any side is unknown (None/"UNK"), we treat it as NOT compatible so API calls
fail fast and force the operator to register the blood type first.
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class ParsedBloodType:
    abo: str | None  # "O", "A", "B", "AB"
    rh: str | None  # "+", "-"


def _parse_blood_type(value: str | None) -> ParsedBloodType:
    if not value:
        return ParsedBloodType(None, None)
    raw = str(value).strip().upper()
    if raw in {"UNK", "UNKNOWN", "NA", "N/A", "NONE"}:
        return ParsedBloodType(None, None)

    if raw.endswith("+"):
        rh = "+"
        abo = raw[:-1]
    elif raw.endswith("-"):
        rh = "-"
        abo = raw[:-1]
    else:
        # Unexpected format.
        return ParsedBloodType(None, None)

    if abo not in {"O", "A", "B", "AB"}:
        return ParsedBloodType(None, None)
    return ParsedBloodType(abo, rh)


def _rbc_abo_compatible(donor_abo: str, recipient_abo: str) -> bool:
    if donor_abo == "O":
        return True
    if donor_abo == "A":
        return recipient_abo in {"A", "AB"}
    if donor_abo == "B":
        return recipient_abo in {"B", "AB"}
    if donor_abo == "AB":
        return recipient_abo == "AB"
    return False


def _plasma_abo_compatible(donor_abo: str, recipient_abo: str) -> bool:
    # Reverse of RBC rules: AB is universal plasma donor; O is universal recipient.
    if donor_abo == "AB":
        return True
    if donor_abo == "A":
        return recipient_abo in {"A", "O"}
    if donor_abo == "B":
        return recipient_abo in {"B", "O"}
    if donor_abo == "O":
        return recipient_abo == "O"
    return False


def _rh_compatible(donor_rh: str, recipient_rh: str) -> bool:
    # Rh- can donate to both; Rh+ only to Rh+.
    if donor_rh == "-":
        return True
    if donor_rh == "+":
        return recipient_rh == "+"
    return False


def is_blood_compatible(
    donor_blood_type: str | None,
    recipient_blood_type: str | None,
    component_type: str | None,
) -> bool:
    donor = _parse_blood_type(donor_blood_type)
    recipient = _parse_blood_type(recipient_blood_type)

    if not donor.abo or not recipient.abo:
        return False

    component = (component_type or "").strip().upper()

    if component in {"WB", "RBC", ""}:
        if not _rbc_abo_compatible(donor.abo, recipient.abo):
            return False
        if not donor.rh or not recipient.rh:
            return False
        return _rh_compatible(donor.rh, recipient.rh)

    if component in {"PLS", "CRY"}:
        return _plasma_abo_compatible(donor.abo, recipient.abo)

    if component in {"PLT"}:
        # Conservative: platelets carry plasma; also enforce Rh to reduce risk.
        if not _plasma_abo_compatible(donor.abo, recipient.abo):
            return False
        if not donor.rh or not recipient.rh:
            return False
        return _rh_compatible(donor.rh, recipient.rh)

    # Unknown component: fail closed.
    return False


def compatibility_error_message(
    donor_blood_type: str | None,
    recipient_blood_type: str | None,
    component_type: str | None,
) -> str:
    component = (component_type or "").strip().upper() or "RBC/WB"
    donor = donor_blood_type or "UNK"
    recipient = recipient_blood_type or "UNK"
    return f"Incompatibilidade sanguinea ({component}): {donor} -> {recipient}."

