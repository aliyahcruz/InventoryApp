type AirtableRecord<T = Record<string, any>> = {
  id: string;
  fields: T;
};

const apiKey = process.env.AIRTABLE_API_KEY;
const baseId = process.env.AIRTABLE_BASE_ID;

export const tableNames = {
  products: process.env.AIRTABLE_PRODUCTS_TABLE || "Products",
  inventory: process.env.AIRTABLE_INVENTORY_TABLE || "Inventory",
  scanLog: process.env.AIRTABLE_SCAN_LOG_TABLE || "Scan Log",
  unknownScans: process.env.AIRTABLE_UNKNOWN_SCANS_TABLE || "Unknown Scans",
  lowStockAlerts: process.env.AIRTABLE_LOW_STOCK_ALERTS_TABLE || "",
};

function assertConfig() {
  if (!apiKey || !baseId) {
    throw new Error("Missing AIRTABLE_API_KEY or AIRTABLE_BASE_ID.");
  }
}

function tableUrl(tableName: string): string {
  assertConfig();
  return `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableName)}`;
}

export function escapeFormulaString(value: string): string {
  return String(value || "").replace(/'/g, "\\'");
}

async function airtableFetch<T>(url: string, init?: RequestInit): Promise<T> {
  assertConfig();
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });

  const text = await res.text();
  let data: any = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }

  if (!res.ok) {
    throw new Error(`Airtable request failed: ${JSON.stringify(data)}`);
  }

  return data as T;
}

export async function listRecords<T = Record<string, any>>(
  tableName: string,
  params?: Record<string, string | number | boolean | undefined>
): Promise<AirtableRecord<T>[]> {
  const url = new URL(tableUrl(tableName));
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== "") url.searchParams.set(key, String(value));
    });
  }

  const records: AirtableRecord<T>[] = [];
  let offset: string | undefined;

  do {
    if (offset) url.searchParams.set("offset", offset);
    const data = await airtableFetch<{ records: AirtableRecord<T>[]; offset?: string }>(url.toString());
    records.push(...(data.records || []));
    offset = data.offset;
  } while (offset);

  return records;
}

export async function createRecord<T = Record<string, any>>(
  tableName: string,
  fields: Record<string, any>
): Promise<AirtableRecord<T>> {
  const data = await airtableFetch<{ records: AirtableRecord<T>[] }>(tableUrl(tableName), {
    method: "POST",
    body: JSON.stringify({ records: [{ fields }] }),
  });
  return data.records[0];
}

export async function updateRecord<T = Record<string, any>>(
  tableName: string,
  id: string,
  fields: Record<string, any>
): Promise<AirtableRecord<T>> {
  const data = await airtableFetch<{ records: AirtableRecord<T>[] }>(tableUrl(tableName), {
    method: "PATCH",
    body: JSON.stringify({ records: [{ id, fields }] }),
  });
  return data.records[0];
}

export async function findInventoryByNdc(ndc: string) {
  const safeNdc = escapeFormulaString(ndc);
  const records = await listRecords(tableNames.inventory, {
    maxRecords: 1,
    filterByFormula: `{NDC}='${safeNdc}'`,
  });
  return records[0] || null;
}

export async function getProductIdFromInventory(inventoryRecord: AirtableRecord): Promise<string | null> {
  const product = inventoryRecord.fields["Product"];
  if (Array.isArray(product) && product[0]) return product[0];
  return null;
}

export async function getMinimumQuantity(inventoryRecord: AirtableRecord): Promise<number> {
  const raw = inventoryRecord.fields["Product Minimum Quantity"];
  if (Array.isArray(raw)) return Number(raw[0] || 0);
  return Number(raw || 0);
}
