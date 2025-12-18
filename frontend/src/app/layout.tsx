import type { Metadata } from "next";
import { Toaster } from "sonner";
import { Providers } from "@/components/providers/Providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Detector de Mudanças - Satélite",
  description: "Detecte mudanças territoriais em imagens de satélite",
  icons: {
    icon: "/iconleonardo.jpg",
    shortcut: "/iconleonardo.jpg",
    apple: "/iconleonardo.jpg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>
        <Providers>
          {children}
        </Providers>
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
