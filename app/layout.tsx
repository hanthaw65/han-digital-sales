import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Han Digital Sales",
  description: "Digital product sales, stock and expiry manager.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="my">
      <body className="antialiased">{children}</body>
    </html>
  );
}
