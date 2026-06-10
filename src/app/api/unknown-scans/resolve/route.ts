import { NextRequest, NextResponse } from "next/server";
import { createRecord, tableNames, updateRecord } from "@/lib/airtable";
import { normalizeNdc } from "@/lib/ndc";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const unknownScanId = String(body.unknownScanId || "");
    const ndc = normalizeNdc(String(body.ndc || ""));
    const productId = String(body.productId || "");
    const currentQuantity = Number(body.currentQuantity || 0);
    const location = String(body.location || "");
    const resolvedBy = String(body.resolvedBy || "");
    const resolutionNotes = String(body.resolutionNotes || "");

    if (!unknownScanId) return NextResponse.json({ error: "Unknown scan ID is required." }, { status: 400 });
    if (!ndc || ndc.length !== 11) return NextResponse.json({ error: "A valid 11-digit NDC is required." }, { status: 400 });
    if (!productId) return NextResponse.json({ error: "Product record ID is required." }, { status: 400 });
    if (!resolvedBy) return NextResponse.json({ error: "Resolved By is required." }, { status: 400 });

    const inventoryFields: Record<string, any> = {
      "NDC": ndc,
      "Product": [productId],
      "Current Quantity": currentQuantity,
      "Barcode Lookup Count": 0,
      "Active": true,
    };

    if (location) inventoryFields["Location"] = location;

    const inventoryRecord = await createRecord(tableNames.inventory, inventoryFields);

    await updateRecord(tableNames.unknownScans, unknownScanId, {
      "Resolved": true,
      "Resolved By": resolvedBy,
      "Resolution Notes": resolutionNotes || `Created Inventory record for NDC ${ndc}.`,
      "Resolved Product": [productId],
      "Resolved Inventory Item": [inventoryRecord.id],
    });

    return NextResponse.json({
      success: true,
      message: "Unknown scan resolved and Inventory record created.",
      inventoryRecord,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to resolve unknown scan." }, { status: 500 });
  }
}
