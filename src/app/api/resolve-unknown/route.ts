import { NextResponse } from "next/server";
import { TABLES, createRecord, updateRecord } from "@/lib/airtable";
export const dynamic = "force-dynamic";
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const unknownId = String(body.unknownId || "");
    const ndc = String(body.ndc || "");
    const productRecordId = String(body.productRecordId || "");
    const currentQuantity = Number(body.currentQuantity || 0);
    const location = String(body.location || "").trim();
    const resolvedBy = String(body.resolvedBy || "").trim();
    if (!unknownId || !ndc || !productRecordId || !resolvedBy) return NextResponse.json({ error: "Unknown scan, NDC, Product, and Resolved By are required." }, { status: 400 });
    const fields: Record<string, any> = { NDC: ndc, Product: [productRecordId], "Current Quantity": currentQuantity, Active: true };
    if (location) fields.Location = location;
    const created = await createRecord(TABLES.inventory, fields);
    const inventoryId = created.records?.[0]?.id;
    await updateRecord(TABLES.unknownScans, unknownId, {
      Resolved: true,
      "Resolved By": resolvedBy,
      "Resolved Product": [productRecordId],
      ...(inventoryId ? { "Resolved Inventory Item": [inventoryId] } : {}),
      "Resolution Notes": `Created Inventory record for NDC ${ndc}`,
    });
    return NextResponse.json({ success: true, inventoryId });
  } catch (err:any) { return NextResponse.json({ error: err.message }, { status: 500 }); }
}
