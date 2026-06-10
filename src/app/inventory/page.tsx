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

export default function InventoryPage() {
  const [records, setRecords] = useState<InventoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");

  async function loadInventory() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/inventory", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to load inventory.");
      setRecords(data.records || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load inventory.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadInventory();
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
      <h1>Inventory</h1>
      <p><a href="/">Back to Scanner</a> · <a href="/unknown-scans">Review Unknown Scans</a></p>

      <div className="card">
        <div className="row spread">
          <div style={{ flex: 1 }}>
            <label>Search inventory</label>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by item name, barcode, or location"
            />
          </div>
          <button className="secondary" onClick={loadInventory} disabled={loading}>Refresh</button>
        </div>

        {loading && <div className="notice">Loading inventory...</div>}
        {error && <div className="notice error">{error}</div>}

        {!loading && !error && filteredRecords.length === 0 && (
          <p className="small">No inventory records found.</p>
        )}

        {!loading && !error && filteredRecords.length > 0 && (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Barcode</th>
                  <th>Current Qty</th>
                  <th>Minimum Qty</th>
                  <th>Location</th>
                  <th>Active</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.map((record) => (
                  <tr key={record.id}>
                    <td><strong>{record.fields["Item Name"] || "Unnamed Item"}</strong></td>
                    <td>{record.fields.Barcode || "—"}</td>
                    <td>{record.fields["Current Quantity"] ?? 0}</td>
                    <td>{record.fields["Minimum Quantity"] ?? 0}</td>
                    <td>{record.fields.Location || "—"}</td>
                    <td>{record.fields.Active === false ? "No" : "Yes"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
