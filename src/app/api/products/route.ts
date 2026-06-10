import { NextResponse } from "next/server";
import { listRecords, tableNames } from "@/lib/airtable";

export async function GET() {
  try {
    const records = await listRecords(tableNames.products, {
      pageSize: 100,
      sort: JSON.stringify([{ field: "Product Name", direction: "asc" }]),
    } as any);

    return NextResponse.json({ records });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to load products." }, { status: 500 });
  }
}
