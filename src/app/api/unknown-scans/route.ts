import { NextResponse } from "next/server";
import { listRecords, tableNames } from "@/lib/airtable";

export async function GET() {
  try {
    const records = await listRecords(tableNames.unknownScans);
    const unresolved = records.filter((record: any) => !record.fields["Resolved"]);

    return NextResponse.json({ records: unresolved });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to load unknown scans." }, { status: 500 });
  }
}
