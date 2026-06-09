"use client";

import { BrowserMultiFormatReader } from "@zxing/browser";
import { useRef, useState } from "react";

type FoundItem = {
  barcode: string;
  itemName?: string;
  previousQuantity?: number;
  newQuantity?: number;
  quantityChange?: number;
};

export default function HomePage() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);

  const [barcode, setBarcode] = useState("");
  const [action, setAction] = useState<"Remove" | "Add">("Remove");
  const [quantity, setQuantity] = useState(1);
  const [scannedBy, setScannedBy] = useState("");
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState<FoundItem | null>(null);
  const [scanning, setScanning] = useState(false);

  async function startScanner() {
    setError("");
    setMessage("Point the camera at a barcode.");
    setScanning(true);

    const reader = new BrowserMultiFormatReader();
    readerRef.current = reader;

    try {
      await reader.decodeFromVideoDevice(undefined, videoRef.current!, (scanResult) => {
        if (scanResult) {
          const text = scanResult.getText();
          setBarcode(text);
          setMessage(`Scanned barcode: ${text}`);
          stopScanner();
        }
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to start scanner.");
      setScanning(false);
    }
  }

  function stopScanner() {
    readerRef.current?.reset();
    setScanning(false);
  }

  async function submitScan() {
    setError("");
    setMessage("Saving scan...");
    setResult(null);

    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ barcode, action, quantity, scannedBy, notes })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Scan failed.");
      setResult(data.item);
      setMessage("Inventory updated and scan logged.");
      setNotes("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Scan failed.");
      setMessage("");
    }
  }

  return (
    <main className="container">
      <h1>Inventory Scanner</h1>
      <p className="small">Scan a barcode, choose Add or Remove, enter quantity, then submit.</p>

      <div className="card">
        <video ref={videoRef} />
        <div className="row" style={{ marginTop: 12 }}>
          {!scanning ? (
            <button className="primary" onClick={startScanner}>Start Scanner</button>
          ) : (
            <button className="danger" onClick={stopScanner}>Stop Scanner</button>
          )}
        </div>
      </div>

      <div className="card">
        <label>Barcode</label>
        <input value={barcode} onChange={(e) => setBarcode(e.target.value)} placeholder="Scan or type barcode" />

        <div className="row">
          <div>
            <label>Action</label>
            <select value={action} onChange={(e) => setAction(e.target.value as "Remove" | "Add")}>
              <option value="Remove">Remove</option>
              <option value="Add">Add</option>
            </select>
          </div>
          <div>
            <label>Quantity</label>
            <input type="number" min="1" value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} />
          </div>
        </div>

        <label>Scanned By</label>
        <input value={scannedBy} onChange={(e) => setScannedBy(e.target.value)} placeholder="Name" />

        <label>Notes</label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes" />

        <button className={action === "Remove" ? "danger" : "success"} onClick={submitScan} disabled={!barcode}>
          Submit {action}
        </button>
      </div>

      {message && <div className="notice">{message}</div>}
      {error && <div className="notice error">{error}</div>}

      {result && (
        <div className="card">
          <h2>{result.itemName}</h2>
          <p>Barcode: {result.barcode}</p>
          <p>Quantity Change: {result.quantityChange}</p>
          <p>Previous Quantity: {result.previousQuantity}</p>
          <p>New Quantity: {result.newQuantity}</p>
        </div>
      )}
    </main>
  );
}
