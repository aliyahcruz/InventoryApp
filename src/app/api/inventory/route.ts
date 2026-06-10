import { NextResponse } from "next/server";
import { getInventory } from "@/lib/airtable";
export const dynamic = "force-dynamic";
export async function GET() {
  try { return NextResponse.json({ records: await getInventory() }); }
  catch (err:any) { return NextResponse.json({ error: err.message }, { status: 500 }); }
}
