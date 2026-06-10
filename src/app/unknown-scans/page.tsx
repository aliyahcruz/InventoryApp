"use client";

import { useEffect, useMemo, useState } from "react";
import Nav from "@/components/Nav";
import { extractNdc } from "@/lib/ndc";

export default function UnknownScansPage() {
  const [records, setRecords] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [forms, setForms] = useState<Record<string, any>>({});

  async function loadUnknownScans() {
    setError("");
    try {
      const res = await fetch("/api/unknown-scans");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load unknown scans");
      setRecords(data.records || []);
    } catch (err: any) {
      setError(err.message || "Failed to load unknown scans");
    }
  }

  async function loadProducts() {
    setError("");
    try {
      const res = await fetch("/api/products");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load products");
      setProducts(data.records || []);
    } catch (err: any) {
      setError(err.message || "Failed to load products");
    }
  }

  useEffect(() => {
    loadUnknownScans();
    loadProducts();
  }, []);

  const filteredProducts = useMemo(() => {
    const q = productSearch.toLowerCase().trim();
    if (!q) return products;
    return products.filter((p) => JSON.stringify(p.fields).toLowerCase().includes(q));
  }, [products, productSearch]);

  function productLabel(product: any) {
    const f = product.fields || {};
    const parts = [
      f["Product Name"],
      f["Generic Name"],
      f["Brand Name"],
      f["Strength"],
      f["Dosage Form"],
    ].filter(Boolean);

    return parts.length ? parts.join(" | ") : product.id;
  }

  function updateForm(id: string, key: string, value: any) {
    setForms((prev) => ({
      ...prev,
      [id]: {
        ...(prev[id] || {}),
        [key]: value,
      },
    }));
  }

  async function resolve(id: string, record: any) {
    setStatus("");
    setError("");

    const form = forms[id] || {};
    const ndc = form.ndc || record.fields["NDC"] || extractNdc(record.fields["Raw Scan Value"] || "");

    try {
      const res = await fetch("/api/unknown-scans/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          unknownScanId: id,
          ndc,
          productId: form.productId,
          currentQuantity: Number(form.currentQuantity || 0),
          location: form.location || "",
          resolvedBy: form.resolvedBy || "",
          resolutionNotes: form.resolutionNotes || "",
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to resolve unknown scan");

      setStatus(data.message || "Resolved");
      setForms((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      await loadUnknownScans();
    } catch (err: any) {
      setError(err.message || "Failed to resolve unknown scan");
    }
  }

  return (
    <main className="container">
      <Nav />
      <h1>Unknown Scans</h1>
      <p>
        Resolve unknown NDCs by selecting the matching Product. The app will create a new Inventory record
        using the NDC and link it to the selected Product.
      </p>

      <div className="card">
        <div className="row">
          <button onClick={() => { loadUnknownScans(); loadProducts(); }}>Refresh</button>
          <input
            value={productSearch}
            onChange={(e) => setProductSearch(e.target.value)}
            placeholder="Filter product dropdown options..."
          />
        </div>
      </div>

      {error && <div className="card error">{error}</div>}
      {status && <div className="card success">{status}</div>}

      {records.length === 0 && <div className="card success">No unresolved unknown scans.</div>}

      {records.map((r) => {
        const form = forms[r.id] || {};
        const raw = r.fields["Raw Scan Value"] || "";
        const ndc = form.ndc ?? r.fields["NDC"] ?? extractNdc(raw);

        return (
          <div className="card" key={r.id}>
            <h2>Unknown Scan</h2>
            <p><strong>Raw Scan:</strong> {raw}</p>
            <p><strong>Detected NDC:</strong> {ndc}</p>
            <p><strong>Action:</strong> {r.fields["Action"]}</p>
            <p><strong>Quantity:</strong> {r.fields["Quantity"]}</p>
            <p><strong>Scanned By:</strong> {r.fields["Scanned By"]}</p>

            <label>NDC</label>
            <input value={ndc} onChange={(e) => updateForm(r.id, "ndc", e.target.value)} />

            <label>Product</label>
            <select
              value={form.productId || ""}
              onChange={(e) => updateForm(r.id, "productId", e.target.value)}
            >
              <option value="">Select a Product...</option>
              {filteredProducts.map((product) => (
                <option key={product.id} value={product.id}>
                  {productLabel(product)}
                </option>
              ))}
            </select>

            <label>Starting Current Quantity</label>
            <input
              type="number"
              value={form.currentQuantity ?? 0}
              onChange={(e) => updateForm(r.id, "currentQuantity", Number(e.target.value || 0))}
            />

            <label>Location</label>
            <input value={form.location || ""} onChange={(e) => updateForm(r.id, "location", e.target.value)} />

            <label>Resolved By required</label>
            <input value={form.resolvedBy || ""} onChange={(e) => updateForm(r.id, "resolvedBy", e.target.value)} />

            <label>Resolution Notes</label>
            <textarea value={form.resolutionNotes || ""} onChange={(e) => updateForm(r.id, "resolutionNotes", e.target.value)} />

            <button
              onClick={() => resolve(r.id, r)}
              disabled={!form.productId || !form.resolvedBy || String(ndc).replace(/\D/g, "").length !== 11}
            >
              Resolve Unknown Scan
            </button>
          </div>
        );
      })}
    </main>
  );
}
