const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const INVENTORY_TABLE = process.env.AIRTABLE_INVENTORY_TABLE || "Inventory";
const SCAN_LOG_TABLE = process.env.AIRTABLE_SCAN_LOG_TABLE || "Scan Log";

if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
  console.warn("Missing Airtable environment variables.");
}

const baseUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}`;

function headers() {
  return {
    Authorization: `Bearer ${AIRTABLE_API_KEY}`,
    "Content-Type": "application/json"
  };
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

function escapeFormulaValue(value: string) {
  return value.replace(/'/g, "\\'");
}

export async function findInventoryByBarcode(barcode: string): Promise<InventoryRecord | null> {
  const formula = `{Barcode}='${escapeFormulaValue(barcode)}'`;
  const url = `${baseUrl}/${encodeURIComponent(INVENTORY_TABLE)}?maxRecords=1&filterByFormula=${encodeURIComponent(formula)}`;
  const res = await fetch(url, { headers: headers(), cache: "no-store" });
  if (!res.ok) throw new Error(`Airtable lookup failed: ${await res.text()}`);
  const data = await res.json();
  return data.records?.[0] || null;
}

export async function listInventory(): Promise<InventoryRecord[]> {
  const url = `${baseUrl}/${encodeURIComponent(INVENTORY_TABLE)}?pageSize=100`;
  const res = await fetch(url, { headers: headers(), cache: "no-store" });
  if (!res.ok) throw new Error(`Airtable inventory fetch failed: ${await res.text()}`);
  const data = await res.json();
  return data.records || [];
}

export async function updateInventoryQuantity(recordId: string, newQuantity: number) {
  const url = `${baseUrl}/${encodeURIComponent(INVENTORY_TABLE)}/${recordId}`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: headers(),
    body: JSON.stringify({ fields: { "Current Quantity": newQuantity } })
  });
  if (!res.ok) throw new Error(`Airtable quantity update failed: ${await res.text()}`);
  return res.json();
}

export async function createScanLog(fields: Record<string, string | number>) {
  const url = `${baseUrl}/${encodeURIComponent(SCAN_LOG_TABLE)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ fields })
  });
  if (!res.ok) throw new Error(`Airtable scan log failed: ${await res.text()}`);
  return res.json();
}
