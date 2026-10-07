"use client";

import { useEffect, useMemo, useState } from "react";
import Nav from "@/components/Nav";

function productName(product: any) {
  const f = product?.fields || {};
  return (
    f["Product Name"] ||
    [f["Generic Name"], f["Brand Name"], f["Strength"], f["Dosage Form"]]
      .filter(Boolean)
      .join(" ") ||
    product?.id ||
    ""
  );
}

function productIds(value: any): string[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [String(value)];
}

export default function PumpsPage() {
  const [inventory, setInventory] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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

      if (!inventoryRes.ok) throw new Error(inventoryData.error || "Failed to load Inventory");
      if (!productsRes.ok) throw new Error(productsData.error || "Failed to load Products");

      setInventory(inventoryData.records || []);
      setProducts(productsData.records || []);
    } catch (err: any) {
      setError(err.message || "Failed to load Pumps");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const productsById = useMemo(() => {
    const map: Record<string, any> = {};
    products.forEach((product) => {
      map[product.id] = product;
    });
    return map;
  }, [products]);

  const pumpInventory = useMemo(() => {
    const q = query.toLowerCase().trim();

    return inventory
      .filter((record) => Number(record.fields["Current Quantity"] || 0) > 0)
      .map((record) => {
        const ids = productIds(record.fields["Product"]);
        const product = ids.map((id) => productsById[id]).find(Boolean);
        return { record, product };
      })
      .filter(({ product }) => product?.fields?.["Pump?"] === true)
      .filter(({ record, product }) => {
        if (!q) return true;
        return JSON.stringify({
          ...record.fields,
          ...product?.fields,
          productName: productName(product),
        }).toLowerCase().includes(q);
      })
      .sort((a, b) =>
        productName(a.product).localeCompare(productName(b.product), undefined, {
          sensitivity: "base",
          numeric: true,
        })
      );
  }, [inventory, productsById, query]);

  const pharmacyRows = pumpInventory.filter(
    ({ record }) => String(record.fields["Location"] || "") === "Pharmacy"
  );

  const awayRows = pumpInventory.filter(({ record }) =>
    ["Patient", "Suite", "On-Call Bag"].includes(
      String(record.fields["Location"] || "")
    )
  );

  function PumpTable({
    title,
    rows,
  }: {
    title: string;
    rows: typeof pumpInventory;
  }) {
    return (
      <div className="card">
        <h2>{title}</h2>
        {rows.length === 0 ? (
          <p>No pumps currently match this location group.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Product Name</th>
                <th>Detected NDC editable</th>
                <th>Location</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ record, product }) => (
                <tr key={record.id}>
                  <td>{productName(product)}</td>
                  <td>{record.fields["NDC"] || ""}</td>
                  <td>{record.fields["Location"] || ""}</td>
                  <td>{record.fields["Notes"] || ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    );
  }

  return (
    <main className="container">
      <Nav />
      <h1>Pumps</h1>
      <p>
        Pumps are grouped by Inventory location. PM and Returned to Vendor are
        intentionally excluded from both tables.
      </p>

      <div className="card">
        <div className="row">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search pump product, NDC, or location..."
          />
          <button onClick={load} disabled={loading}>
            {loading ? "Loading..." : "Refresh"}
          </button>
        </div>
      </div>

      {error && <div className="card error">{error}</div>}

      <PumpTable title="Pharmacy" rows={pharmacyRows} />
      <PumpTable title="Patient / Suite / On-Call Bag" rows={awayRows} />
    </main>
  );
}
