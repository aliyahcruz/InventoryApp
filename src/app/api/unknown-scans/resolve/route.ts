import { NextRequest, NextResponse } from "next/server";
import { createRecord, findInventoryByNdc, tableNames, updateRecord } from "@/lib/airtable";
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

    if (!unknownScanId) {
      return NextResponse.json({ error: "Unknown scan ID is required." }, { status: 400 });
    }

    if (!ndc || ndc.length !== 11) {
      return NextResponse.json({ error: "A valid 11-digit NDC is required." }, { status: 400 });
    }

    if (!productId) {
      return NextResponse.json({ error: "Product selection is required." }, { status: 400 });
    }

    if (!resolvedBy) {
      return NextResponse.json({ error: "Resolved By is required." }, { status: 400 });
    }

    let inventoryRecord = await findInventoryByNdc(ndc);
    let createdNewInventory = false;

    if (!inventoryRecord) {
      const inventoryFields: Record<string, any> = {
        "NDC": ndc,
        "Product": [productId],
        "Current Quantity": currentQuantity,
        "Barcode Lookup Count": 0,
        "Active": true,
      };

      if (location) inventoryFields["Location"] = location;

      inventoryRecord = await createRecord(tableNames.inventory, inventoryFields);
      createdNewInventory = true;
    }

    const finalNotes =
      resolutionNotes ||
      (createdNewInventory
        ? `Created Inventory record for NDC ${ndc}.`
        : `NDC ${ndc} already existed in Inventory. Linked unknown scan to existing Inventory record.`);

    // Required fields only.
    // This avoids Airtable UNKNOWN_FIELD_NAME errors if optional linked fields
    // such as "Resolved Product" or "Resolved Inventory Item" were not created.
    await updateRecord(tableNames.unknownScans, unknownScanId, {
      "Resolved": true,
      "Resolved By": resolvedBy,
      "Resolution Notes": finalNotes,
    });

    return NextResponse.json({
      success: true,
      createdNewInventory,
      message: createdNewInventory
        ? "Unknown scan resolved and new Inventory record created."
        : "Unknown scan resolved. Existing Inventory record was used, so no duplicate NDC was created.",
      inventoryRecord,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to resolve unknown scan." }, { status: 500 });
  }
}
