const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY || "";
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID || "";

export const TABLES = {
  products: process.env.AIRTABLE_PRODUCTS_TABLE || "Products",
  inventory: process.env.AIRTABLE_INVENTORY_TABLE || "Inventory",
  scanLog: process.env.AIRTABLE_SCAN_LOG_TABLE || "Scan Log",
  unknownScans: process.env.AIRTABLE_UNKNOWN_SCANS_TABLE || "Unknown Scans",
  lowStockAlerts: process.env.AIRTABLE_LOW_STOCK_ALERTS_TABLE || "Low Stock Alerts",
};

type AirtableRecord<T = Record<string, any>> = { id: string; fields: T; createdTime?: string };

function ensureEnv() {
  if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) throw new Error("Missing AIRTABLE_API_KEY or AIRTABLE_BASE_ID");
}

function tableUrl(tableName: string) {
  ensureEnv();
  return `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(tableName)}`;
}

async function airtableFetch(path: string, init: RequestInit = {}) {
  const res = await fetch(path, {
    ...init,
    headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}`, "Content-Type": "application/json", ...(init.headers || {}) },
    cache: "no-store",
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) throw new Error(`Airtable request failed: ${JSON.stringify(data)}`);
  return data;
}

function escapeFormulaValue(value: string) {
  return value.replace(/'/g, "\\'");
}

export async function listRecords<T = Record<string, any>>(tableName: string, params?: URLSearchParams): Promise<AirtableRecord<T>[]> {
  const all: AirtableRecord<T>[] = [];
  let offset: string | undefined;
  do {
    const qs = new URLSearchParams(params?.toString());
    if (offset) qs.set("offset", offset);
    const data = await airtableFetch(`${tableUrl(tableName)}?${qs.toString()}`);
    all.push(...(data.records || []));
    offset = data.offset;
  } while (offset);
  return all;
}

export async function findInventoryByNdc(ndc: string) {
  const params = new URLSearchParams();
  params.set("maxRecords", "1");
  params.set("filterByFormula", `{NDC}='${escapeFormulaValue(ndc)}'`);
  const records = await listRecords(TABLES.inventory, params);
  return records[0] || null;
}

export async function updateRecord(tableName: string, recordId: string, fields: Record<string, any>) {
  return airtableFetch(`${tableUrl(tableName)}/${recordId}`, { method: "PATCH", body: JSON.stringify({ fields }) });
}

export async function createRecord(tableName: string, fields: Record<string, any>) {
  return airtableFetch(tableUrl(tableName), { method: "POST", body: JSON.stringify({ records: [{ fields }] }) });
}

export async function incrementInventory(record: AirtableRecord, action: "Add" | "Remove", quantity: number) {
  const previous = Number(record.fields["Current Quantity"] || 0);
  const change = action === "Add" ? quantity : -quantity;
  const next = previous + change;
  const lookupCount = Number(record.fields["Barcode Lookup Count"] || 0) + 1;
  await updateRecord(TABLES.inventory, record.id, { "Current Quantity": next, "Barcode Lookup Count": lookupCount });
  return { previous, next, change };
}

export async function getInventory() {
  return listRecords(TABLES.inventory);
}
