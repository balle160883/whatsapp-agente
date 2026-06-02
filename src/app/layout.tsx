import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "WhatsApp Agente | SaaS de Atención al Cliente",
    template: "%s | WhatsApp Agente",
  },
  description:
    "Plataforma SaaS para atención al cliente por WhatsApp con IA, agenda automática y análisis en tiempo real.",
  keywords: ["WhatsApp", "atención al cliente", "IA", "agenda", "SaaS"],
  robots: "noindex, nofollow",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={inter.variable}>
      <body>{children}</body>
    </html>
  );
}
