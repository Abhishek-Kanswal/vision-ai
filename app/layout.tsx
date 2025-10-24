import type React from "react";
import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { customHeadingFont } from "@/lib/fonts";
import { Analytics } from "@vercel/analytics/next";
import { Suspense } from "react";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";

export const metadata: Metadata = {
  title: "Vision AI",
  description: "Chat with Vision AI",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${customHeadingFont.variable} ${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="font-sans">
        <Suspense
          fallback={
            <div className="flex min-h-screen items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          }
        >
          <ThemeProvider attribute="class">
            {children}
          </ThemeProvider>
        </Suspense>
        <Analytics />
      </body>
    </html>
  );
}