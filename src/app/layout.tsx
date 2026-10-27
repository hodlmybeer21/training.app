import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "TrainField AI: Voice roleplay practice for beer sales reps",
    template: "%s · TrainField AI",
  },
  description: "Rehearse tough buyer conversations out loud with an AI buyer, then get a scored debrief. Free demo, no account needed.",
  metadataBase: new URL("https://training.goodbotai.tech"),
  alternates: { canonical: "./" },
  applicationName: "TrainField AI",
  openGraph: {
    type: "website",
    siteName: "TrainField AI",
    title: "TrainField AI: Train before you pitch",
    description: "Voice roleplay for beer distribution sales reps. Pitch an AI buyer out loud, then get a scored debrief. Free demo, no account needed.",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "TrainField AI: Train before you pitch",
    description: "Voice roleplay for beer distribution sales reps. Pitch an AI buyer out loud, then get a scored debrief.",
  },
};

export const viewport: Viewport = {
  themeColor: "#1A1208",
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
