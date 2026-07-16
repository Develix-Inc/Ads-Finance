import type { Metadata, Viewport } from "next";
import "./globals.css";

export const viewport: Viewport = {
  themeColor: "#F2F5FB",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL("https://adsfinance.vercel.app"),
  applicationName: "AdsFinance",
  authors: [{ name: "AdsFinance Team" }],
  generator: "Next.js",
  keywords: ["AdsFinance", "Digital Advertising Network", "Ad Engagement", "Validator Nodes", "Marketing Infrastructure", "Premium Ad Ecosystem", "Digital Rewards Platform"],
  creator: "AdsFinance",
  publisher: "AdsFinance",
  robots: "index, follow",
  title: "AdsFinance | Premium Digital Engagement Network",
  description: "AdsFinance is a cutting-edge digital engagement platform connecting brands with genuine audiences through our Validator Node ecosystem. Join to participate in verified ad engagement.",
  icons: {
    icon: [
      { url: "/logo-transparent.png", type: "image/png" },
    ],
    apple: "/logo-transparent.png",
    shortcut: "/logo-transparent.png",
  },
  openGraph: {
    title: "AdsFinance | Premium Digital Engagement Network",
    description: "AdsFinance bridges the gap between top-tier advertisers and genuine audiences. Become a Validator and participate in our decentralized ad viewing infrastructure.",
    images: [{ url: "/logo-transparent.png", width: 512, height: 512, alt: "AdsFinance Logo" }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "AdsFinance | Premium Digital Engagement Network",
    description: "Empowering digital advertising through verified engagement. Discover how our Validator Nodes drive quality traffic.",
    images: ["/logo-transparent.png"],
    creator: "@adsfinance",
  },
  alternates: {
    canonical: "/",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-sans antialiased bg-background text-foreground min-h-screen relative overflow-x-hidden">
        {children}
      </body>
    </html>
  );
}
