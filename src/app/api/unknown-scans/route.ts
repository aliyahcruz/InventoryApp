import { NextResponse } from "next/server";
import { TABLES, listRecords } from "@/lib/airtable";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const params = new URLSearchParams();
    params.set("filterByFormula", "NOT({Resolved})");
    const records = await listRecords(TABLES.unknownScans, params);
    return NextResponse.json({ records });
  } catch (err:any) { return NextResponse.json({ error: err.message }, { status: 500 }); }
}
