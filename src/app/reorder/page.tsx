"use client";

import { useEffect, useState } from "react";
import Nav from "@/components/Nav";

export default function ReorderPage() {
  const [records, setRecords] = useState<any[]>([]);
  const [error, setError] = useState("");

  async function load() {
    setError("");
    try {
      const res = await fetch("/api/reorder");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load reorder page");
      setRecords(data.records || []);
    } catch (err: any) {
      setError(err.message || "Failed to load reorder page");
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <main className="container">
      <Nav />
      <h1>Reorder</h1>
      <p>Items where current quantity is at or below the product minimum quantity.</p>

      {error && <div className="card error">{error}</div>}

      <table>
        <thead>
          <tr>
            <th>NDC</th>
            <th>Product</th>
            <th>Current</th>
            <th>Minimum</th>
            <th>Location</th>
          </tr>
        </thead>
        <tbody>
          {records.map((r) => {
            const minRaw = r.fields["Product Minimum Quantity"];
            const min = Array.isArray(minRaw) ? Number(minRaw[0] || 0) : Number(minRaw || 0);
            return (
              <tr key={r.id} className="low">
                <td>{r.fields["NDC"]}</td>
                <td>{Array.isArray(r.fields["Product"]) ? r.fields["Product"].join(", ") : r.fields["Product"]}</td>
                <td>{r.fields["Current Quantity"]}</td>
                <td>{min}</td>
                <td>{r.fields["Location"] || ""}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </main>
  );
}
