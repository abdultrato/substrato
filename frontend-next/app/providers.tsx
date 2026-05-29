"use client" // Necessário para usar hooks do React Query no client.

import { Suspense } from "react"
import { QueryClientProvider } from "@tanstack/react-query"
import { queryClient } from "@/lib/queryClient"
import ToastContainer from "@/components/ui/ToastContainer"
import RequestActivityIndicator from "@/components/ui/RequestActivityIndicator"
import NavigationWarmup from "@/components/navigation/NavigationWarmup"
import NavigationClickFeedback from "@/components/navigation/NavigationClickFeedback"
import FrontendErrorTelemetry from "@/components/monitoring/FrontendErrorTelemetry"
import AutoTranslateTree from "@/components/i18n/AutoTranslateTree"
import { LanguageProvider } from "@/hooks/useLanguage"
import { SafeDataRefreshProvider } from "@/hooks/useSafeDataRefresh"

export default function Providers ( { children }: { children: React.ReactNode } ) {
    // Envolve toda a árvore com React Query e container de toasts.
    return (
        <LanguageProvider>
            <QueryClientProvider client={queryClient}>
                <SafeDataRefreshProvider>
                    <AutoTranslateTree>
                        <NavigationWarmup />
                        <Suspense fallback={null}>
                            <NavigationClickFeedback />
                        </Suspense>
                        <FrontendErrorTelemetry />
                        {children}
                        <RequestActivityIndicator />
                        <ToastContainer />
                    </AutoTranslateTree>
                </SafeDataRefreshProvider>
            </QueryClientProvider>
        </LanguageProvider>
    )
}
