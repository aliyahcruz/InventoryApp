"use client";

import { useEffect, useState } from "react";
import Nav from "@/components/Nav";
import { extractNdc } from "@/lib/ndc";

export default function UnknownScansPage() {
  const [records, setRecords] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [forms, setForms] = useState<Record<string, any>>({});

  async function load() {
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

  useEffect(() => {
    load();
  }, []);

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
      await load();
    } catch (err: any) {
      setError(err.message || "Failed to resolve unknown scan");
    }
  }

  return (
    <main className="container">
      <Nav />
      <h1>Unknown Scans</h1>
      <p>Use this page to create an Inventory record for an unknown 11-digit NDC. You need the Airtable Product record ID for the linked Product field.</p>

      {error && <div className="card error">{error}</div>}
      {status && <div className="card success">{status}</div>}

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

            <label>Product Record ID</label>
            <input
              value={form.productId || ""}
              onChange={(e) => updateForm(r.id, "productId", e.target.value)}
              placeholder="Airtable product record ID, e.g. recXXXXXXXXXXXXXX"
            />

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

            <button onClick={() => resolve(r.id, r)}>Resolve Unknown Scan</button>
          </div>
        );
      })}
    </main>
  );
}
