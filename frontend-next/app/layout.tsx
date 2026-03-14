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

const themeInitScript = `
(function () {
  try {
    var key = "substrato_theme";
    var raw = localStorage.getItem(key);
    var pref = raw ? JSON.parse(raw) : "system";
    var prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    var isDark = pref === "dark" || (pref === "system" && prefersDark);
    var root = document.documentElement;
    if (isDark) root.classList.add("dark");
    else root.classList.remove("dark");
  } catch (e) {
    // ignore
  }
})();`

export default function RootLayout ( { children }: { children: React.ReactNode } ) {
    return (
        <html
            lang="pt"
            suppressHydrationWarning
            className={`${fontSans.variable} ${fontDisplay.variable}`}
        >
            <head>
                <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
            </head>
            <body className="min-h-screen font-sans">
                <AuthProvider>
                    {children}
                </AuthProvider>
            </body>
        </html>
    )
}
