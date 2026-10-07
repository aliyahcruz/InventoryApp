import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Inventory NDC Scanner",
  description: "NDC inventory scanner with Airtable",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
