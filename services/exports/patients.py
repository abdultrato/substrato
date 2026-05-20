"""Gerador de CSV de pacientes."""

import csv
from io import StringIO
from decimal import Decimal

from apps.clinical.models.patient import Patient


def generate_patients_csv(payload: dict) -> tuple[bytes, str, str]:
    """
    Gera CSV com lista de pacientes.

    Args:
        payload: {
            "tenant_id": int,
            "format": "csv",
            "limit": int (default 1000),
            "offset": int (default 0),
            "search": str (optional)
        }

    Returns:
        (csv_bytes, filename, content_type)

    Raises:
        ValueError: Se tenant_id não for fornecido ou se houver erro na geração
    """
    tenant_id = payload.get("tenant_id")
    if not tenant_id:
        raise ValueError("tenant_id é obrigatório no payload.")

    limit = min(int(payload.get("limit", 1000)), 10000)
    offset = int(payload.get("offset", 0))
    search_term = payload.get("search", "").strip()

    # Query otimizada
    qs = Patient.objects.filter(tenant_id=tenant_id, deleted=False)

    if search_term:
        from django.db.models import Q
        qs = qs.filter(
            Q(name__icontains=search_term)
            | Q(email__icontains=search_term)
            | Q(cpf__icontains=search_term)
        )

    qs = qs.values_list(
        "id", "name", "email", "cpf", "birth_date", "gender", "created_at"
    ).order_by("-created_at")

    # Gerar CSV em memória
    output = StringIO()
    writer = csv.writer(output, quoting=csv.QUOTE_ALL)
    writer.writerow(
        ["ID", "Nome", "Email", "CPF", "Data de Nascimento", "Gênero", "Criado em"]
    )

    # Iterar com chunk_size para economizar memória
    count = 0
    for (
        patient_id,
        name,
        email,
        cpf,
        birth_date,
        gender,
        created_at,
    ) in qs[offset : offset + limit].iterator(chunk_size=500):
        writer.writerow(
            [
                patient_id,
                name or "",
                email or "",
                cpf or "",
                birth_date.isoformat() if birth_date else "",
                gender or "",
                created_at.isoformat() if created_at else "",
            ]
        )
        count += 1

    csv_content = output.getvalue()
    csv_bytes = csv_content.encode("utf-8-sig")  # BOM para Excel

    # Timestamp para unicidade
    import time
    timestamp = int(time.time() * 1000)
    filename = f"pacientes_{count}_{timestamp}.csv"

    return csv_bytes, filename, "text/csv"
