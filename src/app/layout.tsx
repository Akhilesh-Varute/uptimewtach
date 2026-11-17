import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { fontClass } from "./marketing-fonts";
import "./globals.css";
import "./marketing.css";

export const metadata: Metadata = {
  title: "UptimeWatch — Simple Uptime Monitoring & Status Pages",
  description: "Monitor your websites and APIs 24/7. Get instant email alerts when your site goes down. Free uptime monitoring for developers and small teams.",
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider
      appearance={{
        variables: {
          colorPrimary: "var(--color-accent)",
          colorBackground: "var(--color-paper-2)",
          colorForeground: "var(--color-ink)",
          colorMutedForeground: "var(--color-muted)",
          colorInput: "var(--color-paper-3)",
          colorInputForeground: "var(--color-ink)",
          colorPrimaryForeground: "var(--color-accent-ink)",
          colorNeutral: "var(--color-ink)",
          colorDanger: "var(--color-bad)",
          colorSuccess: "var(--color-ok)",
          borderRadius: "6px",
          fontFamily: "var(--font-body)",
        },
        elements: { card: { border: "1px solid var(--color-rule)", boxShadow: "none" } },
      }}
    >
      <html lang="en">
        <body className={`hm ${fontClass} min-h-screen bg-gray-950 text-gray-100`}>{children}</body>
      </html>
    </ClerkProvider>
  );
}
