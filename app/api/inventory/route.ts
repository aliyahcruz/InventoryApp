import { NextResponse } from "next/server";
import { listInventory } from "../../../../lib/airtable";

export async function GET() {
  try {
    const records = await listInventory();
    return NextResponse.json({ records });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
