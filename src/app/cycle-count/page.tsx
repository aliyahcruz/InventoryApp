"use client";

import { useState } from "react";
import Nav from "@/components/Nav";
import Scanner from "@/components/Scanner";

type LookupResult = {
  found?: boolean;
  rawScanValue?: string;
  ndc?: string;
  inventoryRecordId?: string;
  productName?: string;
  currentQuantity?: number;
  location?: string;
  usedBarcodeMapping?: boolean;
  message?: string;
};

export default function CycleCountPage() {
  const [result, setResult] = useState<LookupResult | null>(null);
  const [mode, setMode] = useState<"review" | "edit" | "done">("review");
  const [correctedQuantity, setCorrectedQuantity] = useState("");
  const [notes, setNotes] = useState("");
  const [correctedBy, setCorrectedBy] = useState("");
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  async function lookupScan(rawScanValue: string) {
    setLoading(true);
    setStatusMessage("");
    setResult(null);
    setMode("review");
    setCorrectedQuantity("");
    setNotes("");
    setCorrectedBy("");

    try {
      const res = await fetch("/api/cycle-count/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawScanValue }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Cycle count lookup failed.");

      setResult(data);
      if (data.found) {
        setCorrectedQuantity(String(data.currentQuantity ?? ""));
      }
    } catch (error: any) {
      setStatusMessage(error.message || "Cycle count lookup failed.");
    } finally {
      setLoading(false);
    }
  }

  async function markOk() {
    if (!result?.found || !result.ndc) return;

    setLoading(true);
    setStatusMessage("");

    try {
      const res = await fetch("/api/cycle-count/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rawScanValue: result.rawScanValue,
          ndc: result.ndc,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not record cycle count.");

      setMode("done");
      setStatusMessage("✓ Cycle count verified. No inventory change was needed.");
    } catch (error: any) {
      setStatusMessage(error.message || "Could not record cycle count.");
    } finally {
      setLoading(false);
    }
  }

  async function submitCorrection() {
    if (!result?.found || !result.ndc) return;

    setLoading(true);
    setStatusMessage("");

    try {
      const res = await fetch("/api/cycle-count/correct", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rawScanValue: result.rawScanValue,
          ndc: result.ndc,
          correctedQuantity,
          notes,
          correctedBy,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Correction failed.");

      setResult((previous) =>
        previous
          ? { ...previous, currentQuantity: data.correctedQuantity }
          : previous
      );
      setMode("done");
      setStatusMessage(
        `✓ Inventory updated from ${data.previousQuantity} to ${data.correctedQuantity}.`
      );
    } catch (error: any) {
      setStatusMessage(error.message || "Correction failed.");
    } finally {
      setLoading(false);
    }
  }

  function resetForNext() {
    setResult(null);
    setMode("review");
    setCorrectedQuantity("");
    setNotes("");
    setCorrectedBy("");
    setStatusMessage("");
  }

  return (
    <main className="container">
      <Nav />
      <h1>Cycle Count</h1>
      <p>
        Scan an item, compare the physical count with the quantity shown, then
        mark it correct or submit a corrected quantity.
      </p>

      <Scanner onScan={lookupScan} />

      {loading && <div className="card">Working...</div>}

      {statusMessage && (
        <div className={`card ${statusMessage.startsWith("✓") ? "success" : "warning"}`}>
          {statusMessage}
        </div>
      )}

      {result && !result.found && (
        <div className="card error">
          <h2>✕ Item Needs Review</h2>
          <p>{result.message}</p>
          {result.rawScanValue && (
            <p><strong>Raw Scan:</strong> {result.rawScanValue}</p>
          )}
          {result.ndc && (
            <p><strong>Detected NDC:</strong> {result.ndc}</p>
          )}
          <button type="button" onClick={resetForNext}>
            Scan Next Item
          </button>
        </div>
      )}

      {result?.found && (
        <div className="card">
          <h2>Cycle Count Item</h2>

          <p><strong>Product:</strong> {result.productName || "Product not named"}</p>
          <p><strong>NDC:</strong> {result.ndc}</p>
          {result.location && <p><strong>Location:</strong> {result.location}</p>}
          <p><strong>Inventory Quantity:</strong> {result.currentQuantity}</p>

          {mode === "review" && (
            <>
              <p>Does the physical quantity match the Inventory Quantity above?</p>
              <div className="row">
                <button
                  type="button"
                  onClick={markOk}
                  disabled={loading}
                  style={{ fontSize: "1.1rem" }}
                >
                  ✓ Everything OK
                </button>
                <button
                  type="button"
                  className="danger"
                  onClick={() => setMode("edit")}
                  disabled={loading}
                  style={{ fontSize: "1.1rem" }}
                >
                  ✕ Edit Needed
                </button>
              </div>
            </>
          )}

          {mode === "edit" && (
            <div className="card warning">
              <h3>Correct Inventory Quantity</h3>

              <label>Corrected Quantity</label>
              <input
                type="number"
                min={0}
                value={correctedQuantity}
                onChange={(e) => setCorrectedQuantity(e.target.value)}
                placeholder="Enter physical count"
              />

              <label>Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Reason for correction or other notes"
              />

              <label>Corrected By</label>
              <input
                value={correctedBy}
                onChange={(e) => setCorrectedBy(e.target.value)}
                placeholder="Name"
              />

              <div className="row">
                <button
                  type="button"
                  onClick={submitCorrection}
                  disabled={
                    loading ||
                    correctedQuantity === "" ||
                    Number(correctedQuantity) < 0 ||
                    !correctedBy.trim()
                  }
                >
                  {loading ? "Updating..." : "Submit Correction"}
                </button>

                <button
                  type="button"
                  className="secondary"
                  onClick={() => setMode("review")}
                  disabled={loading}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {mode === "done" && (
            <button type="button" onClick={resetForNext}>
              Scan Next Item
            </button>
          )}
        </div>
      )}
    </main>
  );
}
