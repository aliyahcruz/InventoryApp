"use client";

import { useEffect, useState } from "react";

type UnknownScanRecord = {
  id: string;
  createdTime?: string;
  fields: {
    Barcode?: string;
    Action?: string;
    Quantity?: number;
    "Scanned By"?: string;
    Notes?: string;
    Resolved?: boolean;
  };
};

type FormState = Record<string, { itemName: string; currentQuantity: number; minimumQuantity: number; location: string; resolvedBy: string }>;

export default function UnknownScansPage() {
  const [records, setRecords] = useState<UnknownScanRecord[]>([]);
  const [forms, setForms] = useState<FormState>({});
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function loadRecords() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/unknown-scans");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to load unknown scans.");
      setRecords(data.records || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load unknown scans.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadRecords();
  }, []);

  function updateForm(id: string, key: keyof FormState[string], value: string | number) {
    setForms((prev) => {
      const existing = prev[id] ?? {
        itemName: "",
        currentQuantity: records.find((r) => r.id === id)?.fields.Quantity || 0,
        minimumQuantity: 0,
        location: "",
        resolvedBy: ""
      };

      return {
        ...prev,
        [id]: {
          ...existing,
          [key]: value
        }
      };
    });
  }

  async function resolveRecord(record: UnknownScanRecord) {
    const form = forms[record.id] || {
      itemName: "",
      currentQuantity: record.fields.Quantity || 0,
      minimumQuantity: 0,
      location: "",
      resolvedBy: ""
    };

    if (!form.itemName.trim()) {
      setError("Item Name is required to resolve an unknown scan.");
      return;
    }

    if (!form.resolvedBy.trim()) {
      setError("Resolved By is required to resolve an unknown scan.");
      return;
    }

    setError("");
    setMessage("Resolving unknown scan...");

    try {
      const res = await fetch("/api/unknown-scans/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          unknownScanId: record.id,
          barcode: record.fields.Barcode,
          itemName: form.itemName,
          currentQuantity: form.currentQuantity,
          minimumQuantity: form.minimumQuantity,
          location: form.location,
          resolvedBy: form.resolvedBy
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Resolve failed.");
      setMessage("Unknown scan resolved and added to Inventory.");
      await loadRecords();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Resolve failed.");
      setMessage("");
    }
  }

  return (
    <main className="container">
      <h1>Unknown Scans</h1>
      <p><a href="/">Back to Scanner</a> · <a href="/inventory">View Inventory</a></p>
      <p className="small">Use this page to turn unknown barcodes into Inventory records. The scanned quantity is used as the default starting quantity.</p>

      {loading && <div className="notice">Loading unknown scans...</div>}
      {message && <div className="notice">{message}</div>}
      {error && <div className="notice error">{error}</div>}

      {!loading && records.length === 0 && <div className="card">No unresolved unknown scans.</div>}

      {records.map((record) => {
        const form = forms[record.id] || {
          itemName: "",
          currentQuantity: record.fields.Quantity || 0,
          minimumQuantity: 0,
          location: "",
          resolvedBy: ""
        };

        return (
          <div className="card" key={record.id}>
            <h2>{record.fields.Barcode}</h2>
            <p>Action: {record.fields.Action || "N/A"}</p>
            <p>Quantity: {record.fields.Quantity ?? 0}</p>
            <p>Scanned By: {record.fields["Scanned By"] || "Unknown"}</p>
            {record.fields.Notes && <p>Notes: {record.fields.Notes}</p>}

            <label>Item Name</label>
            <input value={form.itemName} onChange={(e) => updateForm(record.id, "itemName", e.target.value)} placeholder="Enter item name" />

            <div className="row">
              <div>
                <label>Starting Quantity</label>
                <input type="number" min="0" value={form.currentQuantity} onChange={(e) => updateForm(record.id, "currentQuantity", Number(e.target.value))} />
              </div>
              <div>
                <label>Minimum Quantity</label>
                <input type="number" min="0" value={form.minimumQuantity} onChange={(e) => updateForm(record.id, "minimumQuantity", Number(e.target.value))} />
              </div>
            </div>

            <label>Location</label>
            <input value={form.location} onChange={(e) => updateForm(record.id, "location", e.target.value)} placeholder="Optional" />

            <label>Resolved By <span className="required">*</span></label>
            <input value={form.resolvedBy} onChange={(e) => updateForm(record.id, "resolvedBy", e.target.value)} placeholder="Required name" />

            <button className="primary" onClick={() => resolveRecord(record)}>Add to Inventory and Mark Resolved</button>
          </div>
        );
      })}
    </main>
  );
}
