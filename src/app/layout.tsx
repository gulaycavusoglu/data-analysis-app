import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Data Analysis Studio",
  description: "Analyse data from databases, CSV, or Excel",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full min-h-screen antialiased font-sans bg-[var(--bg)] text-[var(--text)]">
        {children}
      </body>
    </html>
  );
}
