import type { Metadata } from "next";
import "./globals.css";
import "./styles/animations.css";

export const metadata: Metadata = {
  title: "Dashboard de Leads | Gestão e Automação",
  description: "Plataforma centralizada para gestão de atendimento via WhatsApp com IA",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>
        {children}
      </body>
    </html>
  );
}
