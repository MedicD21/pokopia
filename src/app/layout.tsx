import type { Metadata } from "next";
import { Fredoka, IBM_Plex_Mono } from "next/font/google";

import { SiteShell } from "@/components/layout/site-shell";

import "./globals.css";

const fredoka = Fredoka({
  variable: "--font-round",
  subsets: ["latin"],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-mono-alt",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Pokopia Planner",
  description: "Town planning, voxel building, material tracking, and helper recommendations for an original monster-building world.",
  icons: {
    icon: "/branding/pokopia-logo.png",
    shortcut: "/branding/pokopia-logo.png",
    apple: "/branding/pokopia-logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${fredoka.variable} ${ibmPlexMono.variable} antialiased`}
      >
        <SiteShell>{children}</SiteShell>
      </body>
    </html>
  );
}
