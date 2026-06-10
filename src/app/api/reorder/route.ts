import { NextResponse } from "next/server";
import { listRecords, tableNames } from "@/lib/airtable";

function minQty(fields: Record<string, any>): number {
  const raw = fields["Product Minimum Quantity"];
  if (Array.isArray(raw)) return Number(raw[0] || 0);
  return Number(raw || 0);
}

export async function GET() {
  try {
    const records = await listRecords(tableNames.inventory);

    const low = records.filter((r: any) => {
      const current = Number(r.fields["Current Quantity"] || 0);
      const min = minQty(r.fields);
      return min > 0 && current <= min;
    });

    return NextResponse.json({ records: low });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to load reorder records." }, { status: 500 });
  }
}
