import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import { AuthProvider } from "@/providers/AuthProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "XIA Mate - 공연 관람 기록",
  description: "친구들과 함께하는 XIA(김준수) 공연 관람 기록 사이트",
  icons: {
    icon: "/icon.png",
    apple: "/icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100`}
      >
        <AuthProvider>
          <main className="mx-auto min-h-screen max-w-md bg-white shadow-xl dark:bg-zinc-900 sm:max-w-lg md:max-w-xl lg:max-w-2xl">
            {children}
          </main>
        </AuthProvider>
      </body>
    </html>
  );
}
