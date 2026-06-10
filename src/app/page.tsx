"use client";

import { BrowserMultiFormatReader, type IScannerControls } from "@zxing/browser";
import { KeyboardEvent, useRef, useState } from "react";

type FoundItem = {
  barcode: string;
  itemName?: string;
  previousQuantity?: number;
  newQuantity?: number;
  quantityChange?: number;
};

type UnknownScanResult = { barcode: string; message: string };
type ScanMode = "camera" | "physical";

export default function HomePage() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const physicalInputRef = useRef<HTMLInputElement | null>(null);
  const processingRef = useRef(false);
  const lastBarcodeRef = useRef("");
  const lastScanTimeRef = useRef(0);
  const physicalScanTimerRef = useRef<number | null>(null);

  const [scanMode, setScanMode] = useState<ScanMode>("camera");
  const [physicalScannerValue, setPhysicalScannerValue] = useState("");
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

  function showScanConfirmation(code: string, source: "camera" | "physical") {
    setLastScannedBarcode(code);
    setScanFlash(true);
    playScanBeep();
    window.setTimeout(() => setScanFlash(false), 900);
    setMessage(`✅ Barcode read by ${source === "camera" ? "camera" : "physical scanner"}: ${code}. Review quantity, then submit.`);
  }

  function acceptScannedBarcode(code: string, source: "camera" | "physical") {
    const trimmedCode = code.trim();
    if (!trimmedCode) return;

    const now = Date.now();
    if (trimmedCode === lastBarcodeRef.current && now - lastScanTimeRef.current < 1200) {
      return;
    }

    lastBarcodeRef.current = trimmedCode;
    lastScanTimeRef.current = now;
    setBarcode(trimmedCode);
    setPhysicalScannerValue("");
    showScanConfirmation(trimmedCode, source);
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
        setMessage("Barcode not found. Logged in Unknown Scans for review. Scanner is still ready.");
      } else {
        setResult(data.item);
        setMessage("Inventory updated and scan logged. Scanner is still ready.");
      }
      setNotes("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Scan failed.");
      setMessage("");
    } finally {
      setTimeout(() => {
        processingRef.current = false;
        if (scanMode === "physical") physicalInputRef.current?.focus();
      }, 500);
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
        acceptScannedBarcode(scanResult.getText(), "camera");
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

  function changeScanMode(mode: ScanMode) {
    if (mode === scanMode) return;
    if (scanning) stopScanner();
    if (physicalScanTimerRef.current) window.clearTimeout(physicalScanTimerRef.current);
    setPhysicalScannerValue("");
    setScanMode(mode);
    setMessage(mode === "physical" ? "Physical scanner mode selected. Keep cursor in the scanner input, then scan. No Enter key or button press is needed." : "Camera scan mode selected.");
    setTimeout(() => {
      if (mode === "physical") physicalInputRef.current?.focus();
    }, 50);
  }

  function handlePhysicalScannerChange(value: string) {
    setPhysicalScannerValue(value);

    if (physicalScanTimerRef.current) {
      window.clearTimeout(physicalScanTimerRef.current);
    }

    const trimmedValue = value.trim();
    if (!trimmedValue) return;

    // Physical scanners usually type the barcode very quickly.
    // When typing pauses briefly, treat the value as a completed scan.
    physicalScanTimerRef.current = window.setTimeout(() => {
      acceptScannedBarcode(trimmedValue, "physical");
    }, 250);
  }

  function handlePhysicalScannerKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    // Some scanners are configured to send Enter. Support that too,
    // but Enter is no longer required.
    if (event.key !== "Enter") return;
    event.preventDefault();
    if (physicalScanTimerRef.current) window.clearTimeout(physicalScanTimerRef.current);
    acceptScannedBarcode(physicalScannerValue, "physical");
  }

  return (
    <main className="container">
      <h1>Inventory Scanner</h1>
      <p className="small">Choose camera scanning for a phone/tablet camera, or physical scanner mode for a USB/Bluetooth scanner. After the barcode is read, review action and quantity, then submit.</p>
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

      <div className="card">
        <label>Scan Method</label>
        <div className="scan-mode-grid">
          <button className={scanMode === "camera" ? "primary" : "secondary"} type="button" onClick={() => changeScanMode("camera")}>
            Picture / Camera Scan
          </button>
          <button className={scanMode === "physical" ? "primary" : "secondary"} type="button" onClick={() => changeScanMode("physical")}>
            Physical Scanner
          </button>
        </div>
      </div>

      {scanMode === "camera" && (
        <div className={scanFlash ? "card scanner-card flash-border" : "card scanner-card"}>
          <video ref={videoRef} />
          <div className="row" style={{ marginTop: 12 }}>
            {!scanning ? (
              <button className="primary" onClick={startScanner}>Start Camera Scanner</button>
            ) : (
              <button className="danger" onClick={stopScanner}>Stop Scanner</button>
            )}
          </div>
          <p className="small">Camera stays on until you press Stop Scanner. No auto-submit is used.</p>
        </div>
      )}

      {scanMode === "physical" && (
        <div className={scanFlash ? "card flash-border" : "card"}>
          <h2>Physical Scanner Mode</h2>
          <p className="small">Most USB/Bluetooth barcode scanners work like a keyboard. Click the box below, then scan the item. The Barcode field fills automatically after the scanner finishes typing the code. No Enter key is required.</p>
          <label>Physical scanner input</label>
          <input
            ref={physicalInputRef}
            value={physicalScannerValue}
            onChange={(e) => handlePhysicalScannerChange(e.target.value)}
            onKeyDown={handlePhysicalScannerKeyDown}
            placeholder="Click here, then scan with physical scanner"
            autoFocus
          />
          <p className="small">No button or Enter key is needed. After a scan, review action and quantity, then press Submit.</p>
        </div>
      )}

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

        <button className={action === "Remove" ? "danger" : "success"} onClick={() => submitScan()} disabled={!barcode || processingRef.current}>
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
