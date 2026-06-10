import { NextResponse } from "next/server";
import { listRecords, tableNames } from "@/lib/airtable";

export async function GET() {
  try {
    const records = await listRecords(tableNames.inventory, {
      pageSize: 100,
      sort: JSON.stringify([{ field: "NDC", direction: "asc" }]),
    } as any);

    return NextResponse.json({ records });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to load inventory." }, { status: 500 });
  }
}
