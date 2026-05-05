import type { Metadata } from "next";
import { Montserrat, Oswald, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/sidebar";
import { Toaster } from "@/components/ui/sonner";

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  display: "swap",
});

const oswald = Oswald({
  variable: "--font-oswald",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "BP CFRG — Business Plan Dashboard",
  description: "Tableau de bord financier — CrossFit Rive Gauche",
  icons: {
    icon: "/logo-rg.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`${montserrat.variable} ${oswald.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full font-body">
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="flex-1 overflow-x-auto">
            <div className="mx-auto w-full max-w-[1600px] p-6 lg:p-10">{children}</div>
          </main>
        </div>
        <Toaster />
      </body>
    </html>
  );
}
