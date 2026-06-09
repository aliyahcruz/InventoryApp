"use client";

import { BrowserMultiFormatReader, type IScannerControls } from "@zxing/browser";
import { useRef, useState } from "react";

type FoundItem = {
  barcode: string;
  itemName?: string;
  previousQuantity?: number;
  newQuantity?: number;
  quantityChange?: number;
};

type UnknownScanResult = { barcode: string; message: string };

export default function HomePage() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const processingRef = useRef(false);
  const lastBarcodeRef = useRef("");
  const lastScanTimeRef = useRef(0);

  const [barcode, setBarcode] = useState("");
  const [action, setAction] = useState<"Remove" | "Add">("Remove");
  const [quantity, setQuantity] = useState(1);
  const [scannedBy, setScannedBy] = useState("");
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState<FoundItem | null>(null);
  const [unknownScan, setUnknownScan] = useState<UnknownScanResult | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanFlash, setScanFlash] = useState(false);
  const [lastScannedBarcode, setLastScannedBarcode] = useState("");

  function playScanBeep() {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioContext = new AudioContextClass();
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.connect(gain);
      gain.connect(audioContext.destination);
      oscillator.frequency.value = 880;
      gain.gain.setValueAtTime(0.08, audioContext.currentTime);
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.12);
    } catch {
      // Visual confirmation still works if browser audio is blocked.
    }
  }

  function showScanConfirmation(code: string) {
    setLastScannedBarcode(code);
    setScanFlash(true);
    playScanBeep();
    window.setTimeout(() => setScanFlash(false), 900);
  }

  async function submitScan(barcodeOverride?: string) {
    const code = (barcodeOverride || barcode).trim();
    if (!code) return;

    setError("");
    setMessage("Saving scan...");
    setResult(null);
    setUnknownScan(null);
    processingRef.current = true;

    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ barcode: code, action, quantity, scannedBy, notes })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Scan failed.");

      if (data.unknownScan) {
        setUnknownScan({ barcode: data.barcode, message: data.message });
        setMessage("Barcode not found. Logged in Unknown Scans for review. Scanner is still on.");
      } else {
        setResult(data.item);
        setMessage("Inventory updated and scan logged. Scanner is still on and ready.");
      }
      setNotes("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Scan failed.");
      setMessage("");
    } finally {
      // Keep scanner on. This brief lockout prevents accidental repeat decrements.
      setTimeout(() => {
        processingRef.current = false;
      }, 1500);
    }
  }

  async function startScanner() {
    setError("");
    setMessage("Point the camera at a barcode.");
    setScanning(true);

    const reader = new BrowserMultiFormatReader();

    try {
      const controls = await reader.decodeFromVideoDevice(undefined, videoRef.current!, (scanResult) => {
        if (!scanResult || processingRef.current) return;

        const text = scanResult.getText();
        const now = Date.now();

        // Requested edit #2: scanner stays on; duplicate scan protection prevents
        // the same barcode from decrementing repeatedly while still in view.
        if (text === lastBarcodeRef.current && now - lastScanTimeRef.current < 2500) return;

        lastBarcodeRef.current = text;
        lastScanTimeRef.current = now;
        setBarcode(text);
        showScanConfirmation(text);

        setMessage(`✅ Barcode read: ${text}. Review quantity, then submit.`);
      });
      controlsRef.current = controls;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to start scanner.");
      setScanning(false);
    }
  }

  function stopScanner() {
    controlsRef.current?.stop();
    controlsRef.current = null;
    setScanning(false);
    setMessage("Scanner stopped.");
  }

  return (
    <main className="container">
      <h1>Inventory Scanner</h1>
      <p className="small">Scan a barcode, choose Add or Remove, enter quantity, then submit. The camera stays on until you press Stop Scanner. Unknown barcodes are saved for review.</p>
      <p><a href="/unknown-scans">Review Unknown Scans</a> · <a href="/inventory">View Inventory</a></p>

      {lastScannedBarcode && (
        <div className={scanFlash ? "scan-banner flash" : "scan-banner"}>
          <div className="scan-check">✓</div>
          <div>
            <strong>Barcode read</strong>
            <div>{lastScannedBarcode}</div>
          </div>
        </div>
      )}

      <div className={scanFlash ? "card scanner-card flash-border" : "card scanner-card"}>
        <video ref={videoRef} />
        <div className="row" style={{ marginTop: 12 }}>
          {!scanning ? (
            <button className="primary" onClick={startScanner}>Start Continuous Scanner</button>
          ) : (
            <button className="danger" onClick={stopScanner}>Stop Scanner</button>
          )}
        </div>
        <p className="small">After a scan, review the action and quantity, then press Submit. No auto-submit is used.</p>
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

        <button className={action === "Remove" ? "danger" : "success"} onClick={() => submitScan()} disabled={!barcode}>
          Submit {action}
        </button>
      </div>

      {message && <div className="notice">{message}</div>}
      {error && <div className="notice error">{error}</div>}

      {unknownScan && (
        <div className="card warning">
          <h2>Barcode Not Found</h2>
          <p>Barcode: {unknownScan.barcode}</p>
          <p>{unknownScan.message}</p>
          <p className="small">Inventory was not updated. Review this barcode on the Unknown Scans page.</p>
        </div>
      )}

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
