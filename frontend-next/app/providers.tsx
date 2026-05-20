"use client" // Necessário para usar hooks do React Query no client.

import { QueryClientProvider } from "@tanstack/react-query"
import { queryClient } from "@/lib/queryClient"
import ToastContainer from "@/components/ui/ToastContainer"
import RequestActivityIndicator from "@/components/ui/RequestActivityIndicator"
import NavigationWarmup from "@/components/navigation/NavigationWarmup"
import FrontendErrorTelemetry from "@/components/monitoring/FrontendErrorTelemetry"
import AutoTranslateTree from "@/components/i18n/AutoTranslateTree"
import { LanguageProvider } from "@/hooks/useLanguage"

export default function Providers ( { children }: { children: React.ReactNode } ) {
    // Envolve toda a árvore com React Query e container de toasts.
    return (
        <LanguageProvider>
            <QueryClientProvider client={queryClient}>
                <AutoTranslateTree>
                    <NavigationWarmup />
                    <FrontendErrorTelemetry />
                    {children}
                    <RequestActivityIndicator />
                    <ToastContainer />
                </AutoTranslateTree>
            </QueryClientProvider>
        </LanguageProvider>
    )
}
