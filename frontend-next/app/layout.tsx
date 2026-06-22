// Layout raiz do app Next.js: aplica tema dark/light e injeta AuthProvider.
import "./globals.css";

import type { Metadata, Viewport } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import { AuthProvider } from "@/hooks/useAuth";
import Providers from "./providers";

// Fontes auto-hospedadas pelo Next (self-hosted) para um rendering idêntico em
// qualquer SO (Linux/Windows/Mac) — evita o fallback para Segoe UI no Windows
// que reflui o layout. Expostas como variáveis CSS usadas em --font-sans/-display.
const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});
const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-jakarta",
});

function metadataBaseUrl(): URL {
  const configured =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_FRONTEND_URL ||
    process.env.VERCEL_URL ||
    "http://localhost:5000";

  const origin = /^https?:\/\//i.test(configured)
    ? configured
    : `https://${configured}`;

  try {
    return new URL(origin);
  } catch {
    return new URL("http://localhost:5000");
  }
}

export const metadata: Metadata = {
  metadataBase: metadataBaseUrl(),
  title: "Substrato Healthcare Platform",
  description:
    "Frontend da plataforma Substrato para atendimento e gestão de saúde.",
  icons: {
    icon: "/static/img/logo.png",
    shortcut: "/static/img/logo.png",
    apple: "/static/img/logo.png",
  },
  openGraph: {
    title: "Substrato",
    description: "Sistema Unificado de Base Sustentável.",
    images: ["/static/img/logo.png"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#8430FC",
};

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
      suppressHydrationWarning
      className={`${inter.variable} ${plusJakarta.variable}`}
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
