import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Liars Poker Club",
  description: "Liars Poker Club",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider
      appearance={{
        baseTheme: dark,
        variables: {
          colorBackground: "#0b1220",
          colorInputBackground: "#111827",
          colorInputText: "#f8fafc",
          colorText: "#f8fafc",
          colorTextSecondary: "#cbd5e1",
          colorPrimary: "#ffffff",
        },
        elements: {
          formFieldInput:
            "bg-slate-900 text-white placeholder:text-slate-400 border border-slate-700",
          formButtonPrimary:
            "bg-slate-800 text-white hover:bg-slate-700",
          card: "bg-slate-900/95 text-white border border-slate-800 shadow-xl",
          footer: "bg-slate-900 text-white",
        },
      }}
    >
      <html lang="en">
        <body className={`${geistSans.variable} ${geistMono.variable}`}>
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}