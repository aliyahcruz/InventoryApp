import './globals.css';
import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'NDC Inventory Scanner', description: 'Airtable NDC inventory scanner' };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body><div className="container"><nav className="nav"><a href="/">Scan</a><a href="/inventory">Inventory</a><a href="/unknown-scans">Unknown Scans</a><a href="/reorder">Reorder</a></nav>{children}</div></body></html>;
}
