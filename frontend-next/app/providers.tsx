"use client" // Necessário para usar hooks do React Query no client.

import { Suspense } from "react"
import dynamic from "next/dynamic"
import { QueryClientProvider } from "@tanstack/react-query"
import { queryClient } from "@/lib/queryClient"
import AutoTranslateTree from "@/components/i18n/AutoTranslateTree"
import { LanguageProvider } from "@/hooks/useLanguage"
import { SafeDataRefreshProvider } from "@/hooks/useSafeDataRefresh"

const ToastContainer = dynamic(() => import("@/components/ui/ToastContainer"), { ssr: false })
const ScrollArrowsManager = dynamic(() => import("@/components/ui/ScrollArrowsManager"), { ssr: false })
const NavigationWarmup = dynamic(() => import("@/components/navigation/NavigationWarmup"), { ssr: false })
const NavigationClickFeedback = dynamic(() => import("@/components/navigation/NavigationClickFeedback"), { ssr: false })
const FrontendErrorTelemetry = dynamic(() => import("@/components/monitoring/FrontendErrorTelemetry"), { ssr: false })

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
                        <ToastContainer />
                        <ScrollArrowsManager />
                    </AutoTranslateTree>
                </SafeDataRefreshProvider>
            </QueryClientProvider>
        </LanguageProvider>
    )
}
