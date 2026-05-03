import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/Navbar";
import { LayoutShell } from "@/components/LayoutShell";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "NoteShare",
  description: "Share and discover academic notes",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geist.variable} h-full antialiased`}>
      <body className="min-h-full bg-white dark:bg-black text-zinc-900 dark:text-zinc-100">
        <Navbar />
        <LayoutShell>{children}</LayoutShell>
      </body>
    </html>
  );
}
