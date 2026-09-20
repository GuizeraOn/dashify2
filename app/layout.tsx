import type { Metadata } from "next";
import { Inter } from 'next/font/google';
import "./globals.css";
import Providers from "./providers";

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: "Dashify — Performance em tempo real",
  description: "Dashboard de análise de performance de tráfego pago e vendas.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="dark">
      <body className={`${inter.className} antialiased bg-[#121212] text-white`}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
