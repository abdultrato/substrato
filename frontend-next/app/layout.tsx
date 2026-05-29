// Layout raiz do app Next.js: aplica tema dark/light e injeta AuthProvider.
import "./globals.css";

import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import type { Metadata, Viewport } from "next";
import { AuthProvider } from "@/hooks/useAuth";
import Providers from "./providers";

export const metadata: Metadata = {
  title: "Substrato Healthcare Platform",
  description:
    "Frontend da plataforma Substrato para atendimento e gestão de saúde.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#8430FC",
};

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
});

const display = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-display",
  weight: ["500", "600", "700", "800"],
});

const themeInitScript = `
(function () {
  try {
    var languageKey = "substrato_language";
    var explicitLanguageKey = "substrato_language_explicit";
    var storedLanguage = localStorage.getItem(languageKey);
    var explicitLanguage = localStorage.getItem(explicitLanguageKey) === "1";
    var normalizedLanguage = explicitLanguage && storedLanguage && storedLanguage.toLowerCase().indexOf("en") === 0 ? "en" : "pt";
    document.documentElement.lang = normalizedLanguage;

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
})();`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Define HTML base (lang, tema) e envolve app no AuthProvider.
  return (
    <html
      lang="pt"
      className={`${inter.variable} ${display.variable}`}
      suppressHydrationWarning
    >
      <head suppressHydrationWarning>
        <script
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: themeInitScript }}
        />
      </head>
      <body className="substrato-brand-canvas min-h-screen font-sans antialiased">
        <AuthProvider>
          <Providers>{children}</Providers>
        </AuthProvider>
      </body>
    </html>
  );
}
