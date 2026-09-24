import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/layout/sidebar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "República Caraquista • Plataforma Sabermétrica LVBP",
  description:
    "Analítica deportiva moderna, sabermetría avanzada y seguimiento de Leones del Caracas en la LVBP.",
  icons: {
    icon: "/assets/logo.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={`${geistSans.variable} ${geistMono.variable} h-full dark`}>
      <body className="h-full bg-[#070B19] text-[#F8FAFC] flex overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0 h-full overflow-y-auto">
          {children}
        </div>
      </body>
    </html>
  );
}
