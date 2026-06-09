import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Inventory Scanner",
  description: "Barcode inventory scanner connected to Airtable"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
