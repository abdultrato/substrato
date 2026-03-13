import "./globals.css"

import { AuthProvider } from "@/hooks/useAuth"
import { IBM_Plex_Sans, Space_Grotesk } from "next/font/google"

const fontSans = IBM_Plex_Sans({
    subsets: ["latin"],
    weight: ["400", "500", "600", "700"],
    variable: "--font-sans",
    display: "swap",
})

const fontDisplay = Space_Grotesk({
    subsets: ["latin"],
    weight: ["400", "500", "600", "700"],
    variable: "--font-display",
    display: "swap",
})

export default function RootLayout ( { children }: { children: React.ReactNode } ) {
    return (
        <html lang="pt" className={`${fontSans.variable} ${fontDisplay.variable}`}>
            <body className="min-h-screen font-sans text-slate-950">
                <AuthProvider>
                    {children}
                </AuthProvider>
            </body>
        </html>
    )
}
