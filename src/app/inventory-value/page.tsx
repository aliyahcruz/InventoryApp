"use client";

import { useEffect, useMemo, useState } from "react";
import Nav from "@/components/Nav";

type ValueRow = {
  id: string;
  ndc: string;
  productName: string;
  location: string;
  currentQuantity: number;
  priceEachGpo: number | null;
  priceEach340b: number | null;
  differenceGpo340b: number | null;
  midtown340b: number | null;
  gpoValue: number | null;
  value340b: number | null;
  differenceValue: number | null;
  midtown340bValue: number | null;
};

function money(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return value.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });
}

export default function InventoryValuePage() {
  const [rows, setRows] = useState<ValueRow[]>([]);
  const [totals, setTotals] = useState<any>({});
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("All");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/inventory-value");
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Failed to load inventory value.");

      setRows(data.rows || []);
      setTotals(data.totals || {});
    } catch (err: any) {
      setError(err.message || "Failed to load inventory value.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const locations = useMemo(() => {
    const values = Array.from(new Set(rows.map((row) => row.location).filter(Boolean)));
    values.sort();
    return ["All", ...values];
  }, [rows]);

  const filteredRows = useMemo(() => {
    const q = query.toLowerCase().trim();

    return rows.filter((row) => {
      const matchesQuery =
        !q ||
        row.ndc.toLowerCase().includes(q) ||
        row.productName.toLowerCase().includes(q) ||
        String(row.location || "").toLowerCase().includes(q);

      const matchesLocation = location === "All" || row.location === location;

      return matchesQuery && matchesLocation;
    });
  }, [rows, query, location]);

  const filteredTotals = useMemo(() => {
    return filteredRows.reduce(
      (acc, row) => {
        if (row.gpoValue !== null) acc.gpoValue += row.gpoValue;
        if (row.value340b !== null) acc.value340b += row.value340b;
        if (row.differenceValue !== null) acc.differenceValue += row.differenceValue;
        if (row.midtown340bValue !== null) acc.midtown340bValue += row.midtown340bValue;
        return acc;
      },
      {
        gpoValue: 0,
        value340b: 0,
        differenceValue: 0,
        midtown340bValue: 0,
      }
    );
  }, [filteredRows]);

  return (
    <main className="container">
      <Nav />

      <h1>Inventory Value</h1>
      <p>
        This page multiplies Inventory Current Quantity by the four cost fields in Products.
        Blank cost fields show as — and are excluded from totals.
      </p>

      <div className="card">
        <div className="row">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search Product, NDC, or Location..."
          />

          <select value={location} onChange={(e) => setLocation(e.target.value)}>
            {locations.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>

          <button onClick={load} disabled={loading}>
            {loading ? "Loading..." : "Refresh"}
          </button>
        </div>
      </div>

      {error && <div className="card error">{error}</div>}

      <div className="card success">
        <h2>Totals</h2>
        <div className="row">
          <div><strong>Total GPO:</strong> {money(filteredTotals.gpoValue)}</div>
          <div><strong>Total 340B:</strong> {money(filteredTotals.value340b)}</div>
          <div><strong>Total Difference:</strong> {money(filteredTotals.differenceValue)}</div>
          <div><strong>Total Midtown 340B:</strong> {money(filteredTotals.midtown340bValue)}</div>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>NDC</th>
            <th>Product</th>
            <th>Location</th>
            <th>Qty On Hand</th>
            <th>Price Each GPO</th>
            <th>GPO Value</th>
            <th>Price Each 340B</th>
            <th>340B Value</th>
            <th>Difference GPO/340B</th>
            <th>Difference Value</th>
            <th>Midtown 340B</th>
            <th>Midtown 340B Value</th>
          </tr>
        </thead>

        <tbody>
          {filteredRows.map((row) => (
            <tr key={row.id}>
              <td>{row.ndc}</td>
              <td>{row.productName}</td>
              <td>{row.location}</td>
              <td>{row.currentQuantity}</td>
              <td>{money(row.priceEachGpo)}</td>
              <td>{money(row.gpoValue)}</td>
              <td>{money(row.priceEach340b)}</td>
              <td>{money(row.value340b)}</td>
              <td>{money(row.differenceGpo340b)}</td>
              <td>{money(row.differenceValue)}</td>
              <td>{money(row.midtown340b)}</td>
              <td>{money(row.midtown340bValue)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
