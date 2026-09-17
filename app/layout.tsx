import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DBS Pricing Calculator",
  description: "DBS Building Services - price to charge the client, protecting the target margin.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
