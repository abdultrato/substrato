"use client"

import { ReactNode } from "react"
import { useAuth } from "@/hooks/useAuth"
import useAuthGuard from "@/hooks/useAuthGuard"
import Sidebar from "./Sidebar"
import Header from "./Header"

interface Props {
    children: ReactNode
}

export default function AppLayout ( { children }: Props ) {
    const { loading } = useAuthGuard()
    const { user } = useAuth()

    if ( loading ) {
        return (
            <div className="flex items-center justify-center min-h-screen text-sm text-gray-500">
                Carregando...
            </div>
        )
    }

    return (
        <div className="flex min-h-screen bg-gray-50">
            <Sidebar user={user} />

            <div className="flex flex-col flex-1">
                <Header user={user} />

                <main className="p-6">{children}</main>
            </div>
        </div>
    )
}
