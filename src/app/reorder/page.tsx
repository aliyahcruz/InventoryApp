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

export default function ReorderPage() {
  const [records, setRecords] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [error, setError] = useState("");

  const productMap = useMemo(() => {
    const map: Record<string, string> = {};
    products.forEach((p) => {
      map[p.id] = productLabel(p);
    });
    return map;
  }, [products]);

  async function load() {
    setError("");
    try {
      const [reorderRes, productsRes] = await Promise.all([
        fetch("/api/reorder"),
        fetch("/api/products"),
      ]);

      const reorderData = await reorderRes.json();
      const productsData = await productsRes.json();

      if (!reorderRes.ok) throw new Error(reorderData.error || "Failed to load reorder page");
      if (!productsRes.ok) throw new Error(productsData.error || "Failed to load products");

      setRecords(reorderData.records || []);
      setProducts(productsData.records || []);
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
            const productName = linkedProductName(r.fields["Product"], productMap);

            return (
              <tr key={r.id} className="low">
                <td>{r.fields["NDC"]}</td>
                <td>{productName}</td>
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
