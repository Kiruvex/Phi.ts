import type { Metadata, Viewport } from "next";
import "./globals.css";
import "../styles/phigros.css";
import { Toaster } from "@/components/ui/toaster";
import { PhigrosProvider } from "@/components/phigros/PhigrosProvider";
import { hideRouteOverlay } from "@/lib/phigros/page-transition";

export const metadata: Metadata = {
  title: "Phi.ts",
  description: "Phi.ts — A TypeScript rhythm game",
  manifest: "/phigros/manifest.webmanifest",
  icons: {
    icon: [
      {
        url: "/phigros/assets/images/app_icon.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        url: "/phigros/assets/images/app_icon_576x576.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
    apple: [
      {
        url: "/phigros/assets/images/app_icon.png",
        sizes: "192x192",
        type: "image/png",
      },
    ],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1.0,
  maximumScale: 1.0,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <PhigrosProvider>{children}</PhigrosProvider>
        <Toaster />
      </body>
    </html>
  );
}
