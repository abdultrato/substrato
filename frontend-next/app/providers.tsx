"use client" // Necessário para usar hooks do React Query no client.

import { QueryClientProvider } from "@tanstack/react-query"
import { queryClient } from "@/lib/queryClient"
import ToastContainer from "@/components/ui/ToastContainer"
import RequestActivityIndicator from "@/components/ui/RequestActivityIndicator"
import NavigationWarmup from "@/components/navigation/NavigationWarmup"
import FrontendErrorTelemetry from "@/components/monitoring/FrontendErrorTelemetry"

export default function Providers ( { children }: { children: React.ReactNode } ) {
    // Envolve toda a árvore com React Query e container de toasts.
    return (
        <QueryClientProvider client={queryClient}>
            <NavigationWarmup />
            <FrontendErrorTelemetry />
            {children}
            <RequestActivityIndicator />
            <ToastContainer />
        </QueryClientProvider>
    )
}
