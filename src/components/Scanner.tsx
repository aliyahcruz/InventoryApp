"use client";

import { BrowserMultiFormatReader } from "@zxing/browser";
import { useEffect, useRef, useState } from "react";

type Props = {
  onScan: (value: string) => void;
};

export default function Scanner({ onScan }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const controlsRef = useRef<any>(null);
  const physicalInputRef = useRef<HTMLInputElement | null>(null);
  const lastValueRef = useRef("");
  const lastTimeRef = useRef(0);
  const physicalTimerRef = useRef<any>(null);

  const [mode, setMode] = useState<"camera" | "physical">("physical");
  const [cameraOn, setCameraOn] = useState(false);
  const [physicalValue, setPhysicalValue] = useState("");

  function emitScan(value: string) {
    const clean = value.trim();
    if (!clean) return;

    const now = Date.now();
    if (clean === lastValueRef.current && now - lastTimeRef.current < 1800) return;

    lastValueRef.current = clean;
    lastTimeRef.current = now;
    onScan(clean);
  }

  function completePhysicalScan(value: string) {
    const clean = value.trim();
    if (!clean) return;
    setPhysicalValue(clean);
    emitScan(clean);

    // Clear the scanner input after capture so the next scan starts cleanly.
    setTimeout(() => {
      setPhysicalValue("");
      physicalInputRef.current?.focus();
    }, 150);
  }

  async function startCamera() {
    if (!videoRef.current) return;
    setCameraOn(true);

    const reader = new BrowserMultiFormatReader();

    controlsRef.current = await reader.decodeFromVideoDevice(
      undefined,
      videoRef.current,
      (result) => {
        if (result) emitScan(result.getText());
      }
    );
  }

  function stopCamera() {
    try {
      controlsRef.current?.stop?.();
    } catch {}
    controlsRef.current = null;
    setCameraOn(false);
  }

  useEffect(() => {
    return () => stopCamera();
  }, []);

  useEffect(() => {
    if (mode === "physical") {
      setTimeout(() => physicalInputRef.current?.focus(), 100);
    }
  }, [mode]);

  function handlePhysicalChange(value: string) {
    setPhysicalValue(value);

    if (physicalTimerRef.current) clearTimeout(physicalTimerRef.current);

    // Most physical scanners type the whole value quickly. Capture after a
    // short pause so Enter is not required.
    physicalTimerRef.current = setTimeout(() => {
      completePhysicalScan(value);
    }, 250);
  }

  function handlePhysicalKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" || event.key === "Tab") {
      event.preventDefault();
      if (physicalTimerRef.current) clearTimeout(physicalTimerRef.current);
      completePhysicalScan(physicalValue);
    }
  }

  return (
    <div className="card">
      <h2>Scanner</h2>

      <div className="row">
        <button
          type="button"
          className={mode === "physical" ? "" : "secondary"}
          onClick={() => {
            stopCamera();
            setMode("physical");
          }}
        >
          Physical Scanner
        </button>

        <button
          type="button"
          className={mode === "camera" ? "" : "secondary"}
          onClick={() => setMode("camera")}
        >
          Camera Scanner
        </button>
      </div>

      {mode === "physical" && (
        <div
          className="card warning"
          onClick={() => physicalInputRef.current?.focus()}
          style={{ cursor: "text" }}
        >
          <strong>Physical scanner mode is active.</strong>
          <p>Click/tap the field below, then scan with your USB/Bluetooth scanner. The barcode will populate automatically after the scan finishes. Enter is not required.</p>

          <label>Scanner Input</label>
          <input
            ref={physicalInputRef}
            value={physicalValue}
            onChange={(e) => handlePhysicalChange(e.target.value)}
            onKeyDown={handlePhysicalKeyDown}
            placeholder="Click here, then scan..."
            autoFocus
            inputMode="none"
          />

          <p style={{ marginBottom: 0 }}>
            Tip: if your scanner is configured to send Enter, that still works. If not, the app captures the value after a short pause.
          </p>
        </div>
      )}

      {mode === "camera" && (
        <div>
          <video
            ref={videoRef}
            style={{ width: "100%", maxHeight: 360, background: "#000", borderRadius: 12 }}
            muted
            playsInline
          />

          <div className="row" style={{ marginTop: 12 }}>
            {!cameraOn ? (
              <button type="button" onClick={startCamera}>Start Camera</button>
            ) : (
              <button type="button" className="danger" onClick={stopCamera}>Stop Camera</button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
