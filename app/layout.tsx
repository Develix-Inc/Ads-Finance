import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://adsfinance.vercel.app"),
  title: "AdsFinance | Ads. Growth. Financial Freedom.",
  description: "The institutional-grade digital engagement network. Purchase a Validator License and earn up to 600% ROI through verified ad tasks.",
  icons: {
    icon: [
      { url: "/logo-transparent.png", type: "image/png" },
    ],
    apple: "/logo-transparent.png",
    shortcut: "/logo-transparent.png",
  },
  openGraph: {
    title: "AdsFinance | Ads. Growth. Financial Freedom.",
    description: "Purchase a Validator Node License and earn passive income through verified digital ad engagement tasks.",
    images: [{ url: "/logo-transparent.png", width: 512, height: 512, alt: "AdsFinance Logo" }],
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "AdsFinance",
    description: "Earn passive income through verified ad engagement. Join AdsFinance today.",
    images: ["/logo-transparent.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-sans antialiased bg-background text-foreground min-h-screen">
        {children}
      </body>
    </html>
  );
}

