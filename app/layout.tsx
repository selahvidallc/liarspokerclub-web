import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Geist, Geist_Mono } from "next/font/google";

import { ClerkProvider } from "@clerk/nextjs"
import "./globals.css"

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const themeScript = `
    (function() {
      try {
        var saved = localStorage.getItem('lp-theme') || 'light';
        document.documentElement.setAttribute('data-theme', saved);
      } catch (e) {
        document.documentElement.setAttribute('data-theme', 'light');
      }
    })();
  `

  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <body>
          <script dangerouslySetInnerHTML={{ __html: themeScript }} />
          {children}
        </body>
      </html>
    </ClerkProvider>
  )
}