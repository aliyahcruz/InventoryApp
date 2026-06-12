import Link from "next/link";

export default function Nav() {
  return (
    <nav className="nav">
      <Link href="/">Scan</Link>
      <Link href="/inventory">Inventory</Link>
      <Link href="/reorder">Reorder</Link>
      <Link href="/inventory-value">Inventory Value</Link>
      <Link href="/unknown-scans">Unknown Scans</Link>
    </nav>
  );
}
