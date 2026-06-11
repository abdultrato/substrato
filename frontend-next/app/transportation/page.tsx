"use client"

import { useEffect, useMemo, useState } from "react"
import { ClipboardList, Fuel, Gauge, MapPin, Router, Truck, Users, Wrench } from "lucide-react"

import AppLayout from "@/components/layout/AppLayout"
import WorkspaceHub from "@/components/workspace/WorkspaceHub"
import { useLanguage } from "@/hooks/useLanguage"
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh"
import { apiFetch, extractTotalCount } from "@/lib/api"
import { isNotFoundLikeError } from "@/lib/errors/api-error"
import { GROUPS } from "@/lib/rbac"

const REQUIRED_GROUPS = [
  GROUPS.ADMIN,
  GROUPS.LOGISTICA,
  GROUPS.MANUTENCAO,
  GROUPS.CONTABILIDADE,
  GROUPS.RECURSOS_HUMANOS,
]

export default function TransportationPage() {
  const { t } = useLanguage()
  const safeRefreshToken = useSafeDataRefreshSignal()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [vehicles, setVehicles] = useState(0)
  const [drivers, setDrivers] = useState(0)
  const [routes, setRoutes] = useState(0)
  const [trips, setTrips] = useState(0)
  const [maintenanceOrders, setMaintenanceOrders] = useState(0)
  const [fuelLogs, setFuelLogs] = useState(0)

  useEffect(() => {
    let mounted = true

    async function load() {
      try {
        setLoading(true)
        setError(null)

        const [vehicleRes, driverRes, routeRes, tripRes, maintenanceRes, fuelRes] = await Promise.all([
          apiFetch<any>("/transportation/vehicle/", { clientCache: safeRefreshToken === 0 }),
          apiFetch<any>("/transportation/driver/", { clientCache: safeRefreshToken === 0 }),
          apiFetch<any>("/transportation/route/", { clientCache: safeRefreshToken === 0 }),
          apiFetch<any>("/transportation/trip/", { clientCache: safeRefreshToken === 0 }),
          apiFetch<any>("/transportation/maintenance_order/", { clientCache: safeRefreshToken === 0 }),
          apiFetch<any>("/transportation/fuel_log/", { clientCache: safeRefreshToken === 0 }),
        ])

        if (!mounted) return
        setVehicles(extractTotalCount(vehicleRes))
        setDrivers(extractTotalCount(driverRes))
        setRoutes(extractTotalCount(routeRes))
        setTrips(extractTotalCount(tripRes))
        setMaintenanceOrders(extractTotalCount(maintenanceRes))
        setFuelLogs(extractTotalCount(fuelRes))
      } catch (e: any) {
        if (!mounted) return
        setError(
          isNotFoundLikeError(e)
            ? null
            : e?.message || t("Falha ao carregar o módulo de Transporte.", "Failed to load the Transportation module.")
        )
      } finally {
        if (mounted) setLoading(false)
      }
    }

    load()
    return () => {
      mounted = false
    }
  }, [safeRefreshToken, t])

  const metricValue = useMemo(() => (loading ? "..." : null), [loading])

  return (
    <AppLayout requiredGroups={REQUIRED_GROUPS}>
      <div className="space-y-6">
        {error ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {error}
          </div>
        ) : null}

        <WorkspaceHub
          title="Substrato Transporte"
          adminHref="/admin/transportation/"
          secondaryCta={{ href: "/transportation/vehicles", label: t("Recursos de Transporte", "Transportation resources") }}
          metrics={[
            { label: "Veículos", value: metricValue || vehicles },
            { label: "Motoristas", value: metricValue || drivers },
            { label: "Rotas", value: metricValue || routes },
            { label: "Viagens", value: metricValue || trips },
            { label: "Manutenções", value: metricValue || maintenanceOrders },
            { label: "Abastecimentos", value: metricValue || fuelLogs },
          ]}
          actions={[
            {
              title: "Frota",
              description: t("Veículos, capacidade, estado e odómetro atual.", "Vehicles, capacity, status and current odometer."),
              href: "/transportation/vehicles",
              icon: Truck,
            },
            {
              title: "Motoristas",
              description: t("Cartas, disponibilidade e dados operacionais.", "Licenses, availability and operational data."),
              href: "/transportation/drivers",
              icon: Users,
            },
            {
              title: "Rotas",
              description: t("Planeamento, métricas e otimização de sequência.", "Planning, metrics and sequence optimization."),
              href: "/transportation/routes",
              icon: Router,
            },
            {
              title: "Paragens",
              description: t("Pontos de recolha, entrega e controlo por rota.", "Pickup, delivery and checkpoint stops by route."),
              href: "/transportation/route-stops",
              icon: MapPin,
            },
            {
              title: "Viagens",
              description: t("Despacho, percurso, finalidade e quilometragem.", "Dispatch, route, purpose and mileage."),
              href: "/transportation/trips",
              icon: Gauge,
            },
            {
              title: "Rastreamento",
              description: t("Posições GPS e atualização do último local do veículo.", "GPS positions and latest vehicle location update."),
              href: "/transportation/tracking-points",
              icon: MapPin,
            },
            {
              title: "Manutenção",
              description: t("Planos preventivos e ordens de manutenção.", "Preventive plans and maintenance orders."),
              href: "/transportation/maintenance-orders",
              icon: Wrench,
            },
            {
              title: "Combustível",
              description: t("Abastecimentos, custos e comprovativos.", "Fuel logs, costs and receipts."),
              href: "/transportation/fuel-logs",
              icon: Fuel,
            },
            {
              title: "Planos preventivos",
              description: t("Intervalos por tempo, odómetro ou ambos.", "Intervals by time, odometer or both."),
              href: "/transportation/maintenance-plans",
              icon: ClipboardList,
            },
          ]}
        />
      </div>
    </AppLayout>
  )
}
