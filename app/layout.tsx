import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Logo nas Etiquetas",
  description: "Adicione sua logo às etiquetas de e-commerce direto no navegador.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
