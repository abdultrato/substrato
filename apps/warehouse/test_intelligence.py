from __future__ import annotations

from decimal import Decimal

from apps.warehouse.analytics.metrics.stock import stock_turnover
from apps.warehouse.intelligence.anomalies.stock import detect_anomalous_consumption
from apps.warehouse.intelligence.costs.stock_cost import calculate_weighted_average_cost
from apps.warehouse.intelligence.forecasting.stock import forecast_average_consumption
from apps.warehouse.intelligence.recommendations.stock import recommend_replenishment
from apps.warehouse.intelligence.simulations.replenishment import simulate_days_until_stockout


def test_stock_turnover_never_returns_negative_values():
    assert stock_turnover(Decimal("-10"), Decimal("5")) == Decimal("0")
    assert stock_turnover(Decimal("10"), Decimal("5")) == Decimal("2")
    assert stock_turnover(Decimal("10"), Decimal("0")) == Decimal("0")


def test_forecast_average_consumption_clamps_bad_samples_to_zero():
    forecast = forecast_average_consumption(
        [Decimal("6"), Decimal("-3"), Decimal("3")],
        horizon_days=3,
    )

    assert forecast == Decimal("9")


def test_recommend_replenishment_uses_non_negative_operational_inputs():
    assert recommend_replenishment(Decimal("20"), Decimal("8"), Decimal("2")) == Decimal("14")
    assert recommend_replenishment(Decimal("-20"), Decimal("8"), Decimal("2")) == Decimal("0")
    assert recommend_replenishment(Decimal("20"), Decimal("-8"), Decimal("2")) == Decimal("22")


def test_anomaly_detection_ignores_negative_operational_inputs():
    assert detect_anomalous_consumption(Decimal("21"), Decimal("10"), Decimal("2")) is True
    assert detect_anomalous_consumption(Decimal("-21"), Decimal("10"), Decimal("2")) is False
    assert detect_anomalous_consumption(Decimal("21"), Decimal("-10"), Decimal("2")) is False


def test_weighted_average_cost_never_returns_negative_values():
    assert calculate_weighted_average_cost(Decimal("30"), Decimal("3")) == Decimal("10")
    assert calculate_weighted_average_cost(Decimal("-30"), Decimal("3")) == Decimal("0")
    assert calculate_weighted_average_cost(Decimal("30"), Decimal("-3")) == Decimal("0")


def test_stockout_simulation_handles_zero_and_negative_inputs():
    assert simulate_days_until_stockout(Decimal("10"), Decimal("2")) == 5
    assert simulate_days_until_stockout(Decimal("-10"), Decimal("2")) == 0
    assert simulate_days_until_stockout(Decimal("10"), Decimal("0")) is None
