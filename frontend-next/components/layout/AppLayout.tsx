"use client"

import { ReactNode } from "react"
import { useAuth } from "@/hooks/useAuth"
import useAuthGuard from "@/hooks/useAuthGuard"
import Sidebar from "./Sidebar"
import Header from "./Header"
import AccessDenied from "@/components/auth/AccessDenied"
import { userHasAnyGroup } from "@/lib/rbac"

interface Props {
    children: ReactNode
    requiredGroups?: string[]
}

export default function AppLayout ( { children, requiredGroups }: Props ) {
    const { loading } = useAuthGuard()
    const { user } = useAuth()

    if ( loading ) {
        return (
            <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
                Carregando...
            </div>
        )
    }

    // Auth guard will redirect, but avoid rendering protected shells while it's happening.
    if ( !user ) return null

    if ( requiredGroups?.length && !userHasAnyGroup( user, requiredGroups ) ) {
        return (
            <div className="flex min-h-screen">
                <Sidebar user={user} />

                <div className="flex flex-col flex-1">
                    <Header user={user} />

                    <main className="flex-1 p-3 md:p-4">
                        <AccessDenied requiredGroups={requiredGroups} user={user} />
                    </main>
                </div>
            </div>
        )
    }

    return (
        <div className="flex min-h-screen">
            <Sidebar user={user} />

            <div className="flex flex-col flex-1">
                <Header user={user} />

                <main className="flex-1 p-3 md:p-4">{children}</main>
            </div>
        </div>
    )
}
