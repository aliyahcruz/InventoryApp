"use client";

import { useEffect, useMemo, useState } from "react";
import Nav from "@/components/Nav";

function productLabel(product: any) {
  const f = product?.fields || {};
  return (
    f["Product Name"] ||
    [f["Generic Name"], f["Brand Name"], f["Strength"], f["Dosage Form"]].filter(Boolean).join(" ") ||
    product?.id ||
    ""
  );
}

function linkedProductName(productValue: any, productMap: Record<string, string>) {
  if (!productValue) return "";
  if (Array.isArray(productValue)) {
    return productValue.map((id) => productMap[id] || id).join(", ");
  }
  return productMap[productValue] || String(productValue);
}

export default function InventoryPage() {
  const [records, setRecords] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const productMap = useMemo(() => {
    const map: Record<string, string> = {};
    products.forEach((p) => {
      map[p.id] = productLabel(p);
    });
    return map;
  }, [products]);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [inventoryRes, productsRes] = await Promise.all([
        fetch("/api/inventory"),
        fetch("/api/products"),
      ]);

      const inventoryData = await inventoryRes.json();
      const productsData = await productsRes.json();

      if (!inventoryRes.ok) throw new Error(inventoryData.error || "Failed to load inventory");
      if (!productsRes.ok) throw new Error(productsData.error || "Failed to load products");

      setRecords(inventoryData.records || []);
      setProducts(productsData.records || []);
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

    return records.filter((r) => {
      const productName = linkedProductName(r.fields["Product"], productMap);
      const searchable = JSON.stringify({ ...r.fields, productName }).toLowerCase();
      return searchable.includes(q);
    });
  }, [records, query, productMap]);

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
            const productName = linkedProductName(r.fields["Product"], productMap);

            return (
              <tr key={r.id} className={low ? "low" : ""}>
                <td>{r.fields["NDC"]}</td>
                <td>{productName}</td>
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
