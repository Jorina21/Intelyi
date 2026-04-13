import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Intelyi",
  description: "AI-driven apparel merchandising platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} bg-zinc-50 antialiased`}>
        <header className="border-b bg-white">
          <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
            <Link href="/" className="text-lg font-semibold">
              Intelyi
            </Link>
            <div className="flex items-center gap-6 text-sm font-medium">
              <Link href="/products" className="transition hover:text-zinc-600">
                Products
              </Link>
              <Link href="/cart" className="transition hover:text-zinc-600">
                Cart
              </Link>
              <Link href="/analytics" className="transition hover:text-zinc-600">
                Analytics
              </Link>
            </div>
          </nav>
        </header>
        {children}
      </body>
    </html>
  );
}
