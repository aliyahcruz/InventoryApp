"use client";

import { useEffect, useMemo, useState } from "react";
import Nav from "@/components/Nav";

export default function InventoryPage() {
  const [records, setRecords] = useState<any[]>([]);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/inventory");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load inventory");
      setRecords(data.records || []);
    } catch (err: any) {
      setError(err.message || "Failed to load inventory");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return records;
    return records.filter((r) => JSON.stringify(r.fields).toLowerCase().includes(q));
  }, [records, query]);

  return (
    <main className="container">
      <Nav />
      <h1>Inventory</h1>

      <div className="card">
        <div className="row">
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search NDC, product, location..." />
          <button onClick={load} disabled={loading}>{loading ? "Loading..." : "Refresh"}</button>
        </div>
      </div>

      {error && <div className="card error">{error}</div>}

      <table>
        <thead>
          <tr>
            <th>NDC</th>
            <th>Product</th>
            <th>Current</th>
            <th>Minimum</th>
            <th>Location</th>
            <th>Reorder</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((r) => {
            const current = Number(r.fields["Current Quantity"] || 0);
            const minRaw = r.fields["Product Minimum Quantity"];
            const min = Array.isArray(minRaw) ? Number(minRaw[0] || 0) : Number(minRaw || 0);
            const low = min > 0 && current <= min;
            return (
              <tr key={r.id} className={low ? "low" : ""}>
                <td>{r.fields["NDC"]}</td>
                <td>{Array.isArray(r.fields["Product"]) ? r.fields["Product"].join(", ") : r.fields["Product"]}</td>
                <td>{current}</td>
                <td>{min || ""}</td>
                <td>{r.fields["Location"] || ""}</td>
                <td>{low ? "⚠ Needs reorder" : ""}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </main>
  );
}
