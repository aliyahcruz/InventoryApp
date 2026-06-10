"use client";
import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader, IScannerControls } from "@zxing/browser";
import { extractNdc, formatNdc11 } from "@/lib/ndc";

type Result = any;

export default function HomePage() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const physicalBufferRef = useRef("");
  const physicalTimerRef = useRef<any>(null);
  const lastScanRef = useRef({ value: "", time: 0 });
  const [mode, setMode] = useState<"camera" | "physical">("physical");
  const [scannerOn, setScannerOn] = useState(false);
  const [rawScanValue, setRawScanValue] = useState("");
  const [action, setAction] = useState<"Remove" | "Add">("Remove");
  const [quantity, setQuantity] = useState(1);
  const [scannedBy, setScannedBy] = useState("");
  const [notes, setNotes] = useState("");
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [flash, setFlash] = useState(false);

  const detectedNdc = extractNdc(rawScanValue);

  function cue(value: string) {
    const now = Date.now();
    if (value === lastScanRef.current.value && now - lastScanRef.current.time < 1400) return;
    lastScanRef.current = { value, time: now };
    setRawScanValue(value);
    setFlash(true);
    setTimeout(() => setFlash(false), 350);
    try {
      const audio = new AudioContext();
      const osc = audio.createOscillator();
      const gain = audio.createGain();
      osc.connect(gain); gain.connect(audio.destination); osc.frequency.value = 880; gain.gain.value = 0.04; osc.start();
      setTimeout(() => { osc.stop(); audio.close(); }, 90);
    } catch (_) {}
  }

  async function startCamera() {
    setScannerOn(true);
    const reader = new BrowserMultiFormatReader();
    controlsRef.current = await reader.decodeFromVideoDevice(undefined, videoRef.current!, (res) => {
      if (res) cue(res.getText());
    });
  }

  function stopCamera() {
    controlsRef.current?.stop();
    controlsRef.current = null;
    setScannerOn(false);
  }

  useEffect(() => () => stopCamera(), []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (mode !== "physical") return;
      const target = e.target as HTMLElement;
      if (["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) && target.id !== "physical-capture") return;
      if (e.key.length === 1) {
        physicalBufferRef.current += e.key;
        if (physicalTimerRef.current) clearTimeout(physicalTimerRef.current);
        physicalTimerRef.current = setTimeout(() => {
          const value = physicalBufferRef.current.trim();
          physicalBufferRef.current = "";
          if (value.length >= 6) cue(value);
        }, 120);
      } else if (e.key === "Enter") {
        const value = physicalBufferRef.current.trim();
        physicalBufferRef.current = "";
        if (value.length >= 6) cue(value);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mode]);

  async function submitScan() {
    setProcessing(true); setResult(null);
    try {
      const res = await fetch("/api/scan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rawScanValue, action, quantity, scannedBy, notes }) });
      const data = await res.json();
      setResult(data);
    } catch (e:any) { setResult({ success: false, error: e.message }); }
    finally { setProcessing(false); }
  }

  return <main className={flash ? "flash" : ""}>
    <h1>NDC Inventory Scanner</h1>
    <p className="muted">Scan raw medication barcodes. The app extracts the NDC and tracks inventory by NDC.</p>
    <div className="card">
      <label>Scan Mode</label>
      <div className="row">
        <button className={`button ${mode === "physical" ? "" : "secondary"}`} onClick={() => { stopCamera(); setMode("physical"); }}>Physical Scanner</button>
        <button className={`button ${mode === "camera" ? "" : "secondary"}`} onClick={() => setMode("camera")}>Camera Scanner</button>
      </div>
      {mode === "physical" && <div className="card success"><strong>Physical scanner ready.</strong><br/>Scan with your USB/Bluetooth scanner. The barcode field will populate automatically after the scanner finishes typing.</div>}
      {mode === "camera" && <div><video ref={videoRef}/><div className="row" style={{marginTop:12}}>{!scannerOn ? <button className="button" onClick={startCamera}>Start Camera</button> : <button className="button danger" onClick={stopCamera}>Stop Scanner</button>}</div></div>}
    </div>
    <div className="card">
      <div className="grid">
        <div><label>Raw Scan Value</label><input value={rawScanValue} onChange={e=>setRawScanValue(e.target.value)} placeholder="Scan or paste full barcode" /></div>
        <div><label>Detected NDC</label><input value={detectedNdc ? `${detectedNdc} (${formatNdc11(detectedNdc)})` : ""} readOnly placeholder="Auto-detected" /></div>
      </div>
      {rawScanValue && <div className="card success"><strong>✓ Barcode read</strong><br/>Raw: {rawScanValue}<br/>NDC: {detectedNdc || "No NDC detected"}</div>}
      <div className="grid">
        <div><label>Action</label><select value={action} onChange={e=>setAction(e.target.value as any)}><option>Remove</option><option>Add</option></select></div>
        <div><label>Quantity</label><input type="number" min="1" value={quantity} onChange={e=>setQuantity(Number(e.target.value))}/></div>
        <div><label>Scanned By</label><input value={scannedBy} onChange={e=>setScannedBy(e.target.value)} placeholder="Required by your workflow"/></div>
      </div>
      <label>Notes</label><textarea value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Optional reason or comment" />
      <button className="button" disabled={processing || !rawScanValue || !detectedNdc} onClick={submitScan}>{processing ? "Submitting..." : "Submit Scan"}</button>
    </div>
    {result && <div className={`card ${result.success ? (result.unknownScan ? "warning" : "success") : "dangerBox"}`}>
      <h2>{result.success ? (result.unknownScan ? "Unknown NDC Logged" : "Inventory Updated") : "Error"}</h2>
      {result.error && <p>{result.error}</p>}
      {result.message && <p>{result.message}</p>}
      {result.ndc && <p><strong>NDC:</strong> {result.ndc} ({result.formattedNdc})</p>}
      {result.newQuantity !== undefined && <p><strong>Quantity:</strong> {result.previousQuantity} → {result.newQuantity}</p>}
      {result.lowStock && <p><strong>⚠ LOW STOCK:</strong> Current {result.newQuantity}, Minimum {result.minimumQuantity}</p>}
    </div>}
  </main>;
}
