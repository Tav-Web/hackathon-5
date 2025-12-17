import type { Metadata } from "next";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "Detector de Mudanças - Satélite",
  description: "Detecte mudanças territoriais em imagens de satélite",
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
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
