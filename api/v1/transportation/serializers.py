from rest_framework import serializers

from api.v1.compat import LegacyAliasSerializerMixin
from apps.transportation.models import (
    Driver,
    FuelLog,
    MaintenanceOrder,
    MaintenancePlan,
    RouteStop,
    TransportationRoute,
    Trip,
    Vehicle,
    VehicleTrackingPoint,
)

CORE_READ_ONLY_FIELDS = (
    "id",
    "custom_id",
    "tenant",
    "created_by",
    "updated_by",
    "created_at",
    "updated_at",
    "deleted",
    "deleted_at",
    "deleted_by",
    "version",
)

BASE_ALIASES = {
    "id_custom": "custom_id",
    "nome": "name",
    "codigo": "code",
    "código": "code",
    "estado": "status",
    "situacao": "status",
    "situação": "status",
    "observacoes": "notes",
    "observações": "notes",
    "notas": "notes",
}


class VehicleSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    legacy_input_aliases = {
        **BASE_ALIASES,
        "matricula": "license_plate",
        "matrícula": "license_plate",
        "codigo_frota": "fleet_number",
        "código_frota": "fleet_number",
        "tipo": "vehicle_type",
        "marca": "brand",
        "modelo": "model",
        "ano": "year",
        "cor": "color",
        "combustivel": "fuel_type",
        "combustível": "fuel_type",
        "capacidade": "capacity_value",
        "odometro": "current_odometer_km",
        "odómetro": "current_odometer_km",
    }
    legacy_output_aliases = legacy_input_aliases

    class Meta:
        model = Vehicle
        fields = "__all__"
        read_only_fields = CORE_READ_ONLY_FIELDS


class DriverSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    employee_name = serializers.CharField(source="employee.name", read_only=True)
    legacy_input_aliases = {
        **BASE_ALIASES,
        "funcionario": "employee",
        "funcionário": "employee",
        "documento": "document_number",
        "carta_conducao": "license_number",
        "carta_condução": "license_number",
        "categoria": "license_category",
        "validade_carta": "license_expiry",
        "telefone": "phone",
        "data_admissao": "hire_date",
        "data_admissão": "hire_date",
        "disponibilidade": "availability",
    }
    legacy_output_aliases = legacy_input_aliases

    class Meta:
        model = Driver
        fields = "__all__"
        read_only_fields = (*CORE_READ_ONLY_FIELDS, "employee_name")


class TransportationRouteSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    stop_count = serializers.IntegerField(source="stops.count", read_only=True)
    legacy_input_aliases = {
        **BASE_ALIASES,
        "origem": "origin",
        "destino": "destination",
        "inicio_planeado": "planned_start",
        "início_planeado": "planned_start",
        "fim_planeado": "planned_end",
        "estrategia_otimizacao": "optimization_strategy",
        "estratégia_otimização": "optimization_strategy",
        "estado_otimizacao": "optimization_status",
        "estado_otimização": "optimization_status",
        "distancia_planeada": "planned_distance_km",
        "distância_planeada": "planned_distance_km",
        "duracao_estimada": "estimated_duration_minutes",
        "duração_estimada": "estimated_duration_minutes",
        "distancia_real": "actual_distance_km",
        "distância_real": "actual_distance_km",
        "restricoes": "constraints",
        "restrições": "constraints",
    }
    legacy_output_aliases = legacy_input_aliases

    class Meta:
        model = TransportationRoute
        fields = "__all__"
        read_only_fields = (*CORE_READ_ONLY_FIELDS, "stop_count")


class RouteStopSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    route_code = serializers.CharField(source="route.code", read_only=True)
    legacy_input_aliases = {
        **BASE_ALIASES,
        "rota": "route",
        "posicao": "position",
        "posição": "position",
        "tipo_paragem": "stop_type",
        "local": "location_name",
        "endereco": "address",
        "endereço": "address",
        "janela_inicio": "service_window_start",
        "janela_início": "service_window_start",
        "janela_fim": "service_window_end",
        "chegada_planeada": "planned_arrival",
        "chegada_real": "actual_arrival",
        "carga_recolha": "load_quantity",
        "carga_entrega": "unload_quantity",
        "instrucoes": "instructions",
        "instruções": "instructions",
    }
    legacy_output_aliases = legacy_input_aliases

    class Meta:
        model = RouteStop
        fields = "__all__"
        read_only_fields = (*CORE_READ_ONLY_FIELDS, "route_code")


class TripSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    vehicle_plate = serializers.CharField(source="vehicle.license_plate", read_only=True)
    driver_name = serializers.CharField(source="driver.name", read_only=True)
    route_code = serializers.CharField(source="route.code", read_only=True)
    distance_km = serializers.DecimalField(max_digits=12, decimal_places=3, read_only=True)
    legacy_input_aliases = {
        **BASE_ALIASES,
        "veiculo": "vehicle",
        "veículo": "vehicle",
        "motorista": "driver",
        "rota": "route",
        "local_inicio": "start_location",
        "local_início": "start_location",
        "local_fim": "end_location",
        "inicio_agendado": "scheduled_start",
        "início_agendado": "scheduled_start",
        "fim_agendado": "scheduled_end",
        "inicio_real": "actual_start",
        "início_real": "actual_start",
        "fim_real": "actual_end",
        "finalidade": "purpose",
        "odometro_inicial": "odometer_start_km",
        "odómetro_inicial": "odometer_start_km",
        "odometro_final": "odometer_end_km",
        "odómetro_final": "odometer_end_km",
        "carga": "cargo_description",
        "passageiros": "passenger_count",
    }
    legacy_output_aliases = legacy_input_aliases

    class Meta:
        model = Trip
        fields = "__all__"
        read_only_fields = (*CORE_READ_ONLY_FIELDS, "vehicle_plate", "driver_name", "route_code", "distance_km")


class VehicleTrackingPointSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    vehicle_plate = serializers.CharField(source="vehicle.license_plate", read_only=True)
    trip_label = serializers.CharField(source="trip.custom_id", read_only=True)
    legacy_input_aliases = {
        **BASE_ALIASES,
        "veiculo": "vehicle",
        "veículo": "vehicle",
        "viagem": "trip",
        "registado_em": "recorded_at",
        "registrado_em": "recorded_at",
        "velocidade": "speed_kmh",
        "direcao": "heading_degrees",
        "direção": "heading_degrees",
        "odometro": "odometer_km",
        "odómetro": "odometer_km",
        "precisao": "accuracy_m",
        "precisão": "accuracy_m",
        "origem": "source",
    }
    legacy_output_aliases = legacy_input_aliases

    class Meta:
        model = VehicleTrackingPoint
        fields = "__all__"
        read_only_fields = (*CORE_READ_ONLY_FIELDS, "vehicle_plate", "trip_label")


class MaintenancePlanSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    legacy_input_aliases = {
        **BASE_ALIASES,
        "tipo_veiculo": "vehicle_type",
        "tipo_veículo": "vehicle_type",
        "gatilho": "trigger_type",
        "intervalo_dias": "interval_days",
        "intervalo_km": "interval_km",
        "ativo": "active",
    }
    legacy_output_aliases = legacy_input_aliases

    class Meta:
        model = MaintenancePlan
        fields = "__all__"
        read_only_fields = CORE_READ_ONLY_FIELDS


class MaintenanceOrderSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    vehicle_plate = serializers.CharField(source="vehicle.license_plate", read_only=True)
    plan_code = serializers.CharField(source="plan.code", read_only=True)
    legacy_input_aliases = {
        **BASE_ALIASES,
        "veiculo": "vehicle",
        "veículo": "vehicle",
        "plano": "plan",
        "tipo_manutencao": "maintenance_type",
        "tipo_manutenção": "maintenance_type",
        "aberta_em": "opened_at",
        "data_prevista": "due_date",
        "concluida_em": "completed_at",
        "concluída_em": "completed_at",
        "odometro": "odometer_km",
        "odómetro": "odometer_km",
        "fornecedor": "provider",
        "resumo": "summary",
        "resultado_checklist": "checklist_result",
        "custo": "cost",
    }
    legacy_output_aliases = legacy_input_aliases

    class Meta:
        model = MaintenanceOrder
        fields = "__all__"
        read_only_fields = (*CORE_READ_ONLY_FIELDS, "vehicle_plate", "plan_code")


class FuelLogSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    vehicle_plate = serializers.CharField(source="vehicle.license_plate", read_only=True)
    driver_name = serializers.CharField(source="driver.name", read_only=True)
    trip_label = serializers.CharField(source="trip.custom_id", read_only=True)
    legacy_input_aliases = {
        **BASE_ALIASES,
        "veiculo": "vehicle",
        "veículo": "vehicle",
        "motorista": "driver",
        "viagem": "trip",
        "abastecido_em": "fueled_at",
        "combustivel": "fuel_type",
        "combustível": "fuel_type",
        "odometro": "odometer_km",
        "odómetro": "odometer_km",
        "litros": "liters",
        "preco_unitario": "unit_price",
        "preço_unitário": "unit_price",
        "custo_total": "total_cost",
        "posto": "station",
        "comprovativo": "receipt_number",
    }
    legacy_output_aliases = legacy_input_aliases

    class Meta:
        model = FuelLog
        fields = "__all__"
        read_only_fields = (*CORE_READ_ONLY_FIELDS, "vehicle_plate", "driver_name", "trip_label")


SERIALIZER_MAP = {
    "vehicle": VehicleSerializer,
    "driver": DriverSerializer,
    "route": TransportationRouteSerializer,
    "route_stop": RouteStopSerializer,
    "trip": TripSerializer,
    "tracking_point": VehicleTrackingPointSerializer,
    "maintenance_plan": MaintenancePlanSerializer,
    "maintenance_order": MaintenanceOrderSerializer,
    "fuel_log": FuelLogSerializer,
}
