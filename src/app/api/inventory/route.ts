import { NextResponse } from "next/server";
import { listRecords, tableNames } from "@/lib/airtable";

export async function GET() {
  try {
    const records = await listRecords(tableNames.inventory);

    records.sort((a: any, b: any) =>
      String(a.fields["NDC"] || "").localeCompare(String(b.fields["NDC"] || ""))
    );

    return NextResponse.json({ records });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to load inventory." }, { status: 500 });
  }
}
