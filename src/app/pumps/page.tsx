"use client";

import { useEffect, useMemo, useState } from "react";
import Nav from "@/components/Nav";

function displayValue(value: any) {
  if (value === undefined || value === null || value === "") return "";
  if (value === true) return "Yes";
  if (value === false) return "No";
  if (Array.isArray(value)) return value.join(", ");
  return String(value);
}

export default function PumpsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/products");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load Products");
      setProducts(data.records || []);
    } catch (err: any) {
      setError(err.message || "Failed to load Pumps");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const pumpProducts = useMemo(() => {
    const q = query.toLowerCase().trim();

    return products.filter((product) => {
      const fields = product.fields || {};
      if (fields["Pump?"] !== true) return false;

      if (!q) return true;
      return JSON.stringify(fields).toLowerCase().includes(q);
    });
  }, [products, query]);

  return (
    <main className="container">
      <Nav />
      <h1>Pumps</h1>
      <p>Only Products with the Products table <strong>Pump?</strong> checkbox selected are shown here.</p>

      <div className="card">
        <div className="row">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search pump products..."
          />
          <button onClick={load} disabled={loading}>
            {loading ? "Loading..." : "Refresh"}
          </button>
        </div>
      </div>

      {error && <div className="card error">{error}</div>}
      {!loading && pumpProducts.length === 0 && (
        <div className="card">No Products currently have Pump? checked.</div>
      )}

      {pumpProducts.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>Product</th>
              <th>Generic Name</th>
              <th>Brand Name</th>
              <th>Strength</th>
              <th>Dosage Form</th>
              <th>340B?</th>
              <th>ADM?</th>
            </tr>
          </thead>
          <tbody>
            {pumpProducts.map((product) => {
              const f = product.fields || {};
              return (
                <tr key={product.id}>
                  <td>{displayValue(f["Product Name"])}</td>
                  <td>{displayValue(f["Generic Name"])}</td>
                  <td>{displayValue(f["Brand Name"])}</td>
                  <td>{displayValue(f["Strength"])}</td>
                  <td>{displayValue(f["Dosage Form"])}</td>
                  <td>{displayValue(f["340B?"])}</td>
                  <td>{displayValue(f["ADM?"])}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </main>
  );
}
