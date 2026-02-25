"use client"

import { useState } from "react"
import AppHeader from "./AppHeader"
import AppSidebar from "./AppSidebar"
import MobileSidebar from "./MobileSidebar"

export default function AppLayout ( {
    children,
}: {
    children: React.ReactNode
} ) {
    const [mobileOpen, setMobileOpen] = useState( false )

    return (
        <div className="min-h-screen flex bg-gray-50">
            {/* Desktop Sidebar */}
            <AppSidebar />

            {/* Mobile Sidebar */}
            <MobileSidebar
                open={mobileOpen}
                onClose={() => setMobileOpen( false )}
            />

            <div className="flex-1 flex flex-col">
                <AppHeader
                    onMenuClick={() => setMobileOpen( true )}
                    userName="Admin"
                />

                <main className="p-4 md:p-6">{children}</main>
            </div>
        </div>
    )
}
