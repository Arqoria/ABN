import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { ServiceWorkerRegister } from "@/components/service-worker-register";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// metadataBase : nécessaire pour que les URLs relatives (canonical,
// openGraph.images...) des metadata par page se résolvent correctement
// (sinon Next retombe sur localhost). Pas encore de nom de domaine propre
// (voir docs/Tasks.md, OAuth reporté pour la même raison) — URL Vercel de
// prod en attendant.
export const metadata: Metadata = {
  metadataBase: new URL("https://abn-theta-murex.vercel.app"),
  title: "Les Anges de la Baie de Nice",
  description:
    "Application métier des Anges de la Baie de Nice — coordination des maraudes et de l'aide aux personnes sans-abri.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "ABN",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#0b3d91" },
    { media: "(prefers-color-scheme: dark)", color: "#0a1522" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="fr"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
