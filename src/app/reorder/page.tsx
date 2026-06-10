"use client";

import { useEffect, useMemo, useState } from "react";

type InventoryRecord = {
  id: string;
  fields: {
    Barcode?: string;
    "Item Name"?: string;
    "Current Quantity"?: number;
    "Minimum Quantity"?: number;
    Location?: string;
    Active?: boolean;
  };
};

export default function ReorderPage() {
  const [records, setRecords] = useState<InventoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");

  async function loadRecords() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/reorder", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to load low stock items.");
      setRecords(data.records || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load low stock items.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadRecords();
  }, []);

  const filteredRecords = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return records;
    return records.filter((record) => {
      const itemName = record.fields["Item Name"]?.toLowerCase() || "";
      const barcode = record.fields.Barcode?.toLowerCase() || "";
      const location = record.fields.Location?.toLowerCase() || "";
      return itemName.includes(term) || barcode.includes(term) || location.includes(term);
    });
  }, [records, query]);

  return (
    <main className="container">
      <h1>Reorder / Low Stock</h1>
      <p><a href="/">Back to Scanner</a> · <a href="/inventory">View Inventory</a> · <a href="/unknown-scans">Review Unknown Scans</a></p>
      <p className="small">This page shows Inventory records where Current Quantity is below Minimum Quantity.</p>

      <div className="card warning-card">
        <div className="row spread">
          <div style={{ flex: 1 }}>
            <label>Search low stock items</label>
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by item name, barcode, or location" />
          </div>
          <button className="secondary" onClick={loadRecords} disabled={loading}>Refresh</button>
        </div>

        {loading && <div className="notice">Loading low stock items...</div>}
        {error && <div className="notice error">{error}</div>}
        {!loading && !error && filteredRecords.length === 0 && <p className="small">No low stock items found.</p>}

        {!loading && !error && filteredRecords.length > 0 && (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Barcode</th>
                  <th>Current Qty</th>
                  <th>Minimum Qty</th>
                  <th>Short By</th>
                  <th>Location</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.map((record) => {
                  const current = Number(record.fields["Current Quantity"] || 0);
                  const minimum = Number(record.fields["Minimum Quantity"] || 0);
                  return (
                    <tr key={record.id} className="low-stock-row">
                      <td><strong>{record.fields["Item Name"] || "Unnamed Item"}</strong><div className="low-stock-badge">LOW STOCK</div></td>
                      <td>{record.fields.Barcode || "—"}</td>
                      <td>{current}</td>
                      <td>{minimum}</td>
                      <td>{Math.max(minimum - current, 0)}</td>
                      <td>{record.fields.Location || "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
