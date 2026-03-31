// Layout raiz do app Next.js: aplica tema dark/light e injeta AuthProvider.
import "./globals.css"

import { AuthProvider } from "@/hooks/useAuth"

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
    // Define HTML base (lang, tema) e envolve app no AuthProvider.
    return (
        <html
            lang="pt"
            suppressHydrationWarning
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
