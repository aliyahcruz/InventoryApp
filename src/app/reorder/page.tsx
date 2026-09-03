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

function linkedProductIds(productValue: any): string[] {
  if (!productValue) return [];
  return Array.isArray(productValue) ? productValue : [String(productValue)];
}

function displayProductField(
  productValue: any,
  productsById: Record<string, any>,
  fieldName: string
) {
  const values = linkedProductIds(productValue)
    .map((id) => productsById[id]?.fields?.[fieldName])
    .filter((value) => value !== undefined && value !== null && value !== "");

  if (values.length === 0) return "";

  return values
    .map((value) => {
      if (value === true) return "Yes";
      if (value === false) return "No";
      if (Array.isArray(value)) return value.join(", ");
      return String(value);
    })
    .join(", ");
}

export default function ReorderPage() {
  const [records, setRecords] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [error, setError] = useState("");

  const productsById = useMemo(() => {
    const map: Record<string, any> = {};
    products.forEach((p) => {
      map[p.id] = p;
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
            <th>340B?</th>
            <th>ADM?</th>
            <th>Current</th>
            <th>Minimum</th>
            <th>Location</th>
          </tr>
        </thead>
        <tbody>
          {records.map((r) => {
            const minRaw = r.fields["Product Minimum Quantity"];
            const min = Array.isArray(minRaw) ? Number(minRaw[0] || 0) : Number(minRaw || 0);
            const ids = linkedProductIds(r.fields["Product"]);
            const productName = ids.map((id) => productLabel(productsById[id]) || id).join(", ");
            const value340B = displayProductField(r.fields["Product"], productsById, "340B?");
            const adm = displayProductField(r.fields["Product"], productsById, "ADM?");

            return (
              <tr key={r.id} className="low">
                <td>{r.fields["NDC"]}</td>
                <td>{productName}</td>
                <td>{value340B}</td>
                <td>{adm}</td>
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
