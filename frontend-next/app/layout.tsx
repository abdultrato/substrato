import { AuthProvider } from "@/hooks/useAuth"

export default function RootLayout ( { children }: { children: React.ReactNode } ) {
    return (
        <html lang="pt">
            <body>
                <AuthProvider>
                    {children}
                </AuthProvider>
            </body>
        </html>
    )
}
