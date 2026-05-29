"""Servidor TCP/IP simples para ingestão de mensagens de equipamentos."""

from __future__ import annotations

import json
import socketserver
from typing import Any

from django.core.management.base import BaseCommand, CommandError

from apps.equipment_integrations.models import IntegrationEquipment
from apps.equipment_integrations.services import (
    EquipmentIngestionError,
    ingest_equipment_payload,
    normalize_tcp_payload,
)


class EquipmentTcpHandler(socketserver.BaseRequestHandler):
    """Recebe uma mensagem, normaliza e aplica no pipeline de integração."""

    def handle(self):
        server: EquipmentTcpServer = self.server  # type: ignore[assignment]
        self.request.settimeout(server.timeout_seconds)
        chunks: list[bytes] = []
        total = 0

        while True:
            data = self.request.recv(4096)
            if not data:
                break
            chunks.append(data)
            total += len(data)
            if total > server.max_bytes:
                self._send({"status": "error", "detail": "Mensagem excede o tamanho máximo."})
                return
            if server.stop_after_frame(data, b"".join(chunks)):
                break

        raw = b"".join(chunks)
        if not raw:
            self._send({"status": "error", "detail": "Mensagem vazia."})
            return

        text = raw.decode(server.encoding, errors="replace")
        payload = normalize_tcp_payload(text, server.equipment)

        try:
            response = ingest_equipment_payload(
                equipment=server.equipment,
                payload=payload,
                raw_body=raw,
                content_type=f"text/plain; charset={server.encoding}",
            )
        except EquipmentIngestionError as exc:
            self._send({"status": "error", "detail": exc.detail, "errors": [exc.detail]})
            return
        except Exception as exc:  # pragma: no cover - proteção operacional do listener
            self._send({"status": "error", "detail": str(exc)})
            return

        self._send({"status": "ok", **response})

    def _send(self, payload: dict[str, Any]) -> None:
        server: EquipmentTcpServer = self.server  # type: ignore[assignment]
        data = json.dumps(payload, ensure_ascii=False, default=str).encode(server.encoding)
        if server.framing == IntegrationEquipment.TcpFraming.MLLP:
            data = b"\x0b" + data + b"\x1c\r"
        else:
            data += b"\n"
        self.request.sendall(data)


class EquipmentTcpServer(socketserver.ThreadingTCPServer):
    allow_reuse_address = True

    def __init__(
        self,
        server_address,
        handler_class,
        *,
        equipment: IntegrationEquipment,
        encoding: str,
        framing: str,
        timeout_seconds: int,
        max_bytes: int,
    ):
        self.equipment = equipment
        self.encoding = encoding
        self.framing = framing
        self.timeout_seconds = timeout_seconds
        self.max_bytes = max_bytes
        super().__init__(server_address, handler_class)

    def stop_after_frame(self, last_chunk: bytes, all_data: bytes) -> bool:
        if self.framing == IntegrationEquipment.TcpFraming.MLLP:
            return b"\x1c\r" in all_data or all_data.endswith(b"\x1c")
        if self.framing == IntegrationEquipment.TcpFraming.RAW:
            return False
        return b"\n" in last_chunk or b"\r" in last_chunk


class Command(BaseCommand):
    help = "Inicia listener TCP/IP para um equipamento integrado."

    def add_arguments(self, parser):
        parser.add_argument("--equipment", required=True, help="custom_id do equipamento integrado.")
        parser.add_argument("--host", default="", help="Host/interface local. Padrão: tcp_host ou 127.0.0.1.")
        parser.add_argument("--port", type=int, default=0, help="Porta local. Padrão: tcp_port do equipamento.")
        parser.add_argument("--max-bytes", type=int, default=1024 * 1024, help="Tamanho máximo de cada mensagem.")

    def handle(self, *args, **options):
        equipment = IntegrationEquipment.objects.filter(
            custom_id=options["equipment"],
            deleted=False,
        ).select_related("tenant").first()
        if equipment is None:
            raise CommandError("Equipamento integrado não encontrado.")
        if not equipment.active:
            raise CommandError("Equipamento integrado está inativo.")

        host = options["host"] or equipment.tcp_host or "127.0.0.1"
        port = int(options["port"] or equipment.tcp_port or 0)
        if not port:
            raise CommandError("Informe --port ou configure tcp_port no equipamento.")

        framing = equipment.tcp_framing or IntegrationEquipment.TcpFraming.JSON_LINE
        encoding = equipment.encoding or "utf-8"
        timeout_seconds = int(equipment.tcp_timeout_seconds or 30)

        self.stdout.write(
            self.style.SUCCESS(
                f"Listener TCP/IP de {equipment.custom_id} em {host}:{port} "
                f"({equipment.protocol}, {framing})."
            )
        )

        with EquipmentTcpServer(
            (host, port),
            EquipmentTcpHandler,
            equipment=equipment,
            encoding=encoding,
            framing=framing,
            timeout_seconds=timeout_seconds,
            max_bytes=int(options["max_bytes"]),
        ) as server:
            try:
                server.serve_forever()
            except KeyboardInterrupt:
                self.stdout.write("\nListener encerrado.")
