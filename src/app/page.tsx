"use client";

import { useEffect, useState } from "react";
import Nav from "@/components/Nav";
import Scanner from "@/components/Scanner";
import { extractNdc, normalizeNdc } from "@/lib/ndc";

type ScanResponse = {
  success?: boolean;
  unknownScan?: boolean;
  message?: string;
  rawScanValue?: string;
  ndc?: string;
  productName?: string;
  previousQuantity?: number;
  newQuantity?: number;
  minimumQuantity?: number;
  lowStock?: boolean;
};

export default function HomePage() {
  const [rawScanValue, setRawScanValue] = useState("");
  const [detectedNdc, setDetectedNdc] = useState("");
  const [action, setAction] = useState<"Remove" | "Add">("Remove");
  const [quantity, setQuantity] = useState(1);
  const [scannedBy, setScannedBy] = useState("");
  const [notes, setNotes] = useState("");
  const [result, setResult] = useState<ScanResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    const suggested = extractNdc(rawScanValue);
    setDetectedNdc(suggested);
  }, [rawScanValue]);

  function onScan(value: string) {
    const suggested = extractNdc(value);

    setRawScanValue(value);
    setDetectedNdc(suggested);
    setResult({
      message: "Barcode read. Review or edit the detected NDC, action, and quantity, then submit.",
      rawScanValue: value,
      ndc: suggested,
    });
    setFlash(true);
    setTimeout(() => setFlash(false), 500);

    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.frequency.value = 880;
      gain.gain.value = 0.04;
      oscillator.start();
      oscillator.stop(ctx.currentTime + 0.08);
    } catch {}
  }

  async function submitScan() {
    setLoading(true);
    setResult(null);

    try {
      const ndc = normalizeNdc(detectedNdc);

      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawScanValue, ndc, action, quantity, scannedBy, notes }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Scan failed");
      setResult(data);
    } catch (error: any) {
      setResult({ success: false, message: error.message || "Scan failed" });
    } finally {
      setLoading(false);
    }
  }

  const normalizedDetectedNdc = normalizeNdc(detectedNdc);

  return (
    <main className="container">
      <Nav />
      <h1>Inventory NDC Scanner</h1>

      <Scanner onScan={onScan} />

      <div className={`card ${flash ? "scan-flash success" : ""}`}>
        <h2>Scan Details</h2>

        <label>Raw Scan Value</label>
        <input value={rawScanValue} onChange={(e) => setRawScanValue(e.target.value)} placeholder="Scan or type barcode value" />

        <label>Detected NDC editable</label>
        <input
          value={detectedNdc}
          onChange={(e) => setDetectedNdc(e.target.value)}
          placeholder="Review or correct 11-digit NDC"
        />
        {normalizedDetectedNdc && normalizedDetectedNdc.length !== 11 && (
          <p style={{ color: "#9f1d1d" }}>
            NDC should be 11 digits. Current normalized length: {normalizedDetectedNdc.length}
          </p>
        )}

        <div className="row">
          <div style={{ flex: 1 }}>
            <label>Action</label>
            <select value={action} onChange={(e) => setAction(e.target.value as "Remove" | "Add")}>
              <option>Remove</option>
              <option>Add</option>
            </select>
          </div>

          <div style={{ flex: 1 }}>
            <label>Quantity</label>
            <input type="number" min={1} value={quantity} onChange={(e) => setQuantity(Number(e.target.value || 1))} />
          </div>
        </div>

        <label>Scanned By</label>
        <input value={scannedBy} onChange={(e) => setScannedBy(e.target.value)} placeholder="Name" />

        <label>Notes</label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes" />

        <button disabled={loading || !rawScanValue || normalizedDetectedNdc.length !== 11 || quantity < 1} onClick={submitScan}>
          {loading ? "Submitting..." : "Submit Inventory Change"}
        </button>
      </div>

      {result && (
        <div className={`card ${result.success ? "success" : result.unknownScan || result.lowStock ? "warning" : "error"}`}>
          <h2>{result.success ? "Scan Complete" : result.unknownScan ? "Unknown NDC Logged" : "Scan Status"}</h2>
          <p>{result.message}</p>
          {result.rawScanValue && <p><strong>Raw Scan:</strong> {result.rawScanValue}</p>}
          {result.ndc && <p><strong>NDC Used:</strong> {result.ndc}</p>}
          {result.productName && <p><strong>Product:</strong> {result.productName}</p>}
          {typeof result.previousQuantity === "number" && <p><strong>Previous Quantity:</strong> {result.previousQuantity}</p>}
          {typeof result.newQuantity === "number" && <p><strong>New Quantity:</strong> {result.newQuantity}</p>}
          {result.lowStock && (
            <p><strong>⚠ Low stock:</strong> current quantity is at or below minimum quantity ({result.minimumQuantity}).</p>
          )}
        </div>
      )}
    </main>
  );
}
