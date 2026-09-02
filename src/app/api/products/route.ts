import { NextResponse } from "next/server";
import { listRecords, tableNames } from "@/lib/airtable";

export async function GET() {
  try {
    const records = await listRecords(tableNames.products);

    records.sort((a: any, b: any) =>
      String(a.fields["Product Name"] || "").localeCompare(String(b.fields["Product Name"] || ""))
    );

    return NextResponse.json({ records });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to load products." }, { status: 500 });
  }
}
