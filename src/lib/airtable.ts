const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const INVENTORY_TABLE = process.env.AIRTABLE_INVENTORY_TABLE || "Inventory";
const SCAN_LOG_TABLE = process.env.AIRTABLE_SCAN_LOG_TABLE || "Scan Log";
const UNKNOWN_SCANS_TABLE = process.env.AIRTABLE_UNKNOWN_SCANS_TABLE || "Unknown Scans";
const LOW_STOCK_ALERTS_TABLE = process.env.AIRTABLE_LOW_STOCK_ALERTS_TABLE || "Low Stock Alerts";

function requireEnv(name: string, value: string | undefined) {
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function baseUrl(tableName: string) {
  const baseId = requireEnv("AIRTABLE_BASE_ID", AIRTABLE_BASE_ID);
  return `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableName)}`;
}

function headers() {
  const apiKey = requireEnv("AIRTABLE_API_KEY", AIRTABLE_API_KEY);
  return { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" };
}

async function airtableFetch(url: string, init?: RequestInit) {
  const res = await fetch(url, { ...init, cache: "no-store" });
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) {
    const message = data?.error?.message || text || "Unknown Airtable error";
    throw new Error(`Airtable request failed: ${message}`);
  }
  return data;
}

export type InventoryRecord = {
  id: string;
  fields: {
    Barcode?: string;
    "Item Name"?: string;
    "Current Quantity"?: number;
    "Minimum Quantity"?: number;
    Location?: string;
    Active?: boolean;
  };
};

export type UnknownScanRecord = {
  id: string;
  createdTime?: string;
  fields: {
    Barcode?: string;
    Action?: string;
    Quantity?: number;
    "Scanned By"?: string;
    Notes?: string;
    Resolved?: boolean;
    "Resolved By"?: string;
    "Resolution Notes"?: string;
  };
};

function escapeFormulaValue(value: string) {
  return value.replace(/'/g, "\\'");
}

export function isLowStock(record: InventoryRecord) {
  const currentQuantity = Number(record.fields["Current Quantity"] || 0);
  const minimumQuantity = Number(record.fields["Minimum Quantity"] || 0);
  return minimumQuantity > 0 && currentQuantity < minimumQuantity;
}

export async function findInventoryByBarcode(barcode: string): Promise<InventoryRecord | null> {
  const formula = `{Barcode}='${escapeFormulaValue(barcode)}'`;
  const url = `${baseUrl(INVENTORY_TABLE)}?maxRecords=1&filterByFormula=${encodeURIComponent(formula)}`;
  const data = await airtableFetch(url, { headers: headers() });
  return data.records?.[0] || null;
}

export async function listInventory(): Promise<InventoryRecord[]> {
  const data = await airtableFetch(`${baseUrl(INVENTORY_TABLE)}?pageSize=100`, { headers: headers() });
  return data.records || [];
}

export async function listLowStockInventory(): Promise<InventoryRecord[]> {
  const records = await listInventory();
  return records.filter(isLowStock);
}

export async function updateInventoryQuantity(recordId: string, newQuantity: number) {
  return airtableFetch(`${baseUrl(INVENTORY_TABLE)}/${recordId}`, {
    method: "PATCH",
    headers: headers(),
    body: JSON.stringify({ fields: { "Current Quantity": newQuantity } })
  });
}

export async function createInventory(fields: Record<string, string | number | boolean>) {
  return airtableFetch(baseUrl(INVENTORY_TABLE), {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ fields })
  });
}

export async function createScanLog(fields: Record<string, string | number>) {
  return airtableFetch(baseUrl(SCAN_LOG_TABLE), {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ fields })
  });
}

export async function createUnknownScan(fields: Record<string, string | number | boolean>) {
  return airtableFetch(baseUrl(UNKNOWN_SCANS_TABLE), {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ fields })
  });
}

export async function createLowStockAlert(fields: Record<string, string | number | boolean>) {
  return airtableFetch(baseUrl(LOW_STOCK_ALERTS_TABLE), {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ fields })
  });
}

export async function listUnresolvedUnknownScans(): Promise<UnknownScanRecord[]> {
  const formula = `NOT({Resolved})`;
  const url = `${baseUrl(UNKNOWN_SCANS_TABLE)}?pageSize=100&filterByFormula=${encodeURIComponent(formula)}`;
  const data = await airtableFetch(url, { headers: headers() });
  return data.records || [];
}

export async function getUnknownScan(recordId: string): Promise<UnknownScanRecord> {
  return airtableFetch(`${baseUrl(UNKNOWN_SCANS_TABLE)}/${recordId}`, { headers: headers() });
}

export async function markUnknownScanResolved(recordId: string, resolvedBy: string, resolutionNotes?: string) {
  const fields: Record<string, string | boolean> = {
    Resolved: true,
    "Resolved By": resolvedBy
  };
  if (resolutionNotes) fields["Resolution Notes"] = resolutionNotes;
  return airtableFetch(`${baseUrl(UNKNOWN_SCANS_TABLE)}/${recordId}`, {
    method: "PATCH",
    headers: headers(),
    body: JSON.stringify({ fields })
  });
}
