import { NextResponse } from "next/server";
import { listRecords, tableNames } from "@/lib/airtable";

export async function GET() {
  try {
    const records = await listRecords(tableNames.unknownScans, {
      pageSize: 100,
      filterByFormula: "NOT({Resolved})",
    } as any);

    return NextResponse.json({ records });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to load unknown scans." }, { status: 500 });
  }
}
