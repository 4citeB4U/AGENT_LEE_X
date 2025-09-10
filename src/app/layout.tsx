import type { Metadata } from "next";
import { Toaster } from "@/components/ui/toaster";
import "./globals.css";
import { BackgroundFx } from "@/components/login/BackgroundFx";

export const metadata: Metadata = {
  title: "Agent Lee — Premium AI Assistant | MACMILLION",
  description: "Experience Agent Lee, the premium AI assistant with voice cloning, unified search, real-time communication, and luxury interface. Built by RWD with gold and emerald luxury design.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <link crossOrigin="anonymous" rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link crossOrigin="anonymous" href="/assets/fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=PT+Sans:ital,wght@0,400;0,700;1,400;1,700&family=Source+Code+Pro&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased">
        <BackgroundFx />
        {children}
        <Toaster />
      </body>
    </html>
  );
}
