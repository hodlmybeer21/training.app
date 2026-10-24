import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "TrainField AI: Voice roleplay practice for beer sales reps",
    template: "%s · TrainField AI",
  },
  description: "Rehearse tough buyer conversations out loud with an AI buyer, then get a scored debrief. Free demo, no account needed.",
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
