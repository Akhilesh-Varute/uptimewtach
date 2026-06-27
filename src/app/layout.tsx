import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

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
    <ClerkProvider>
      <html lang="en" className={inter.className}>
        <body className="min-h-screen bg-gray-950 text-gray-100">{children}</body>
      </html>
    </ClerkProvider>
  );
}
