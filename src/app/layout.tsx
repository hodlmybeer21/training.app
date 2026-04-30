import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TrainField AI — Voice Training for Beer Distribution Teams",
  description: "The AI flight simulator for beer distribution sales teams. Practice every conversation before it happens — from angry retailer objections to annual reviews.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;700&display=swap" rel="stylesheet" />
      </head>
      <body className="h-full" style={{ background: 'var(--dark)', color: 'var(--cream)' }}>{children}</body>
    </html>
  );
}
