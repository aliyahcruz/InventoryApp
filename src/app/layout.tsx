import "./globals.css";

export const metadata = {
  title: "Inventory Scanner",
  description: "Barcode inventory scanner connected to Airtable"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <nav className="nav">
          <a href="/">Scan</a>
          <a href="/inventory">Inventory</a>
        </nav>
        {children}
      </body>
    </html>
  );
}
