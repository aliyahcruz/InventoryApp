"use client";

import { BrowserMultiFormatReader } from "@zxing/browser";
import { useEffect, useRef, useState } from "react";

type Props = {
  onScan: (value: string) => void;
};

export default function Scanner({ onScan }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const controlsRef = useRef<any>(null);
  const lastValueRef = useRef("");
  const lastTimeRef = useRef(0);
  const physicalBufferRef = useRef("");
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
    if (mode !== "physical") return;

    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();

      if (tag === "input" || tag === "textarea" || tag === "select") return;

      if (event.key === "Enter" || event.key === "Tab") {
        event.preventDefault();
        const value = physicalBufferRef.current;
        physicalBufferRef.current = "";
        setPhysicalValue(value);
        emitScan(value);
        return;
      }

      if (event.key.length !== 1) return;

      physicalBufferRef.current += event.key;
      setPhysicalValue(physicalBufferRef.current);

      if (physicalTimerRef.current) clearTimeout(physicalTimerRef.current);

      // Physical scanners type quickly. After no characters arrive for 250ms,
      // treat the buffer as a completed scan. This means Enter is not required.
      physicalTimerRef.current = setTimeout(() => {
        const value = physicalBufferRef.current;
        physicalBufferRef.current = "";
        setPhysicalValue(value);
        emitScan(value);
      }, 250);
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (physicalTimerRef.current) clearTimeout(physicalTimerRef.current);
    };
  }, [mode]);

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
        <div className="card warning">
          <strong>Physical scanner mode is active.</strong>
          <p>Scan with your USB/Bluetooth scanner. The barcode will populate automatically after the scan finishes. Enter is not required.</p>
          <label>Last physical scan buffer</label>
          <input value={physicalValue} readOnly placeholder="Waiting for scan..." />
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
