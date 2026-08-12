import type { Metadata, Viewport } from "next";
import "./globals.css";
import RegisterSW from "@/components/RegisterSW";
import RememberMeGuard from "@/components/RememberMeGuard";
import InstallPrompt from "@/components/InstallPrompt";

export const metadata: Metadata = {
  title: "Marchewski App",
  description: "Assessoria esportiva — treinos e acompanhamento de alunos",
  manifest: "/manifest.json",
  icons: {
    icon: "/icon-192.png",
    apple: "/icon-192.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black",
    title: "Marchewski",
  },
};

export const viewport: Viewport = {
  themeColor: "#1F2556",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-white">
        {children}
        <RegisterSW />
        <RememberMeGuard />
        <InstallPrompt />
      </body>
    </html>
  );
}
