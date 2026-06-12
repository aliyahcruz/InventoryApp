import { NextRequest, NextResponse } from "next/server";
import { createRecord, findInventoryByNdc, findUnknownScanById, tableNames, updateRecord } from "@/lib/airtable";
import { normalizeNdc } from "@/lib/ndc";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const unknownScanId = String(body.unknownScanId || "");
    const ndc = normalizeNdc(String(body.ndc || ""));
    const productId = String(body.productId || "");
    const fallbackCurrentQuantity = Number(body.currentQuantity || 0);
    const location = String(body.location || "");
    const resolvedBy = String(body.resolvedBy || "");
    const resolutionNotes = String(body.resolutionNotes || "");

    if (!unknownScanId) return NextResponse.json({ error: "Unknown scan ID is required." }, { status: 400 });
    if (!ndc || ndc.length !== 11) return NextResponse.json({ error: "A valid 11-digit NDC is required." }, { status: 400 });
    if (!productId) return NextResponse.json({ error: "Product selection is required." }, { status: 400 });
    if (!resolvedBy) return NextResponse.json({ error: "Resolved By is required." }, { status: 400 });

    const unknownScan = await findUnknownScanById(unknownScanId);
    if (!unknownScan) {
      return NextResponse.json({ error: "Unknown Scan record was not found." }, { status: 404 });
    }

    const rawScanValue = String(unknownScan.fields["Raw Scan Value"] || "");
    const action = unknownScan.fields["Action"] === "Add" ? "Add" : "Remove";
    const unknownQuantity = Math.max(1, Number(unknownScan.fields["Quantity"] || 1));
    const scannedBy = String(unknownScan.fields["Scanned By"] || resolvedBy || process.env.DEFAULT_SCANNED_BY || "Inventory User");
    const originalNotes = String(unknownScan.fields["Notes"] || "");
    const quantityChange = action === "Add" ? unknownQuantity : -unknownQuantity;

    let inventoryRecord = await findInventoryByNdc(ndc);
    let createdNewInventory = false;
    let previousQuantity = 0;
    let newQuantity = 0;

    if (!inventoryRecord) {
      // New Inventory item from unknown scan:
      // Add 5 -> Current Quantity = 5.
      // Remove 5 -> Current Quantity = 0 unless a manual starting quantity was entered.
      const startingQuantity =
        action === "Add"
          ? unknownQuantity
          : fallbackCurrentQuantity > 0
            ? fallbackCurrentQuantity
            : 0;

      const inventoryFields: Record<string, any> = {
        "NDC": ndc,
        "Product": [productId],
        "Current Quantity": startingQuantity,
        "Barcode Lookup Count": 1,
        "Active": true,
      };

      if (location) inventoryFields["Location"] = location;

      inventoryRecord = await createRecord(tableNames.inventory, inventoryFields);
      createdNewInventory = true;
      previousQuantity = 0;
      newQuantity = startingQuantity;
    } else {
      // Existing NDC: apply the previously captured unknown quantity.
      previousQuantity = Number(inventoryRecord.fields["Current Quantity"] || 0);
      newQuantity = previousQuantity + quantityChange;

      const barcodeLookupCount = Number(inventoryRecord.fields["Barcode Lookup Count"] || 0) + 1;

      await updateRecord(tableNames.inventory, inventoryRecord.id, {
        "Current Quantity": newQuantity,
        "Barcode Lookup Count": barcodeLookupCount,
      });
    }

    const finalNotes =
      resolutionNotes ||
      (createdNewInventory
        ? `Created Inventory record for NDC ${ndc} and applied unknown scan quantity.`
        : `NDC ${ndc} already existed in Inventory. Applied unknown scan quantity to existing Inventory record.`);

    await updateRecord(tableNames.unknownScans, unknownScanId, {
      "Resolved": true,
      "Resolved By": resolvedBy,
      "Resolution Notes": finalNotes,
    });

    // Field-safe Scan Log: no "Inventory Item" linked field required.
    try {
      await createRecord(tableNames.scanLog, {
        "Raw Scan Value": rawScanValue,
        "NDC": ndc,
        "Action": action,
        "Quantity Change": createdNewInventory ? newQuantity : quantityChange,
        "Previous Quantity": previousQuantity,
        "New Quantity": newQuantity,
        "Scanned By": scannedBy,
        "Notes": originalNotes || finalNotes,
      });
    } catch {
      // Resolution should still succeed even if Scan Log table has missing optional fields.
    }

    return NextResponse.json({
      success: true,
      createdNewInventory,
      message: createdNewInventory
        ? `Unknown scan resolved. Inventory record created with Current Quantity ${newQuantity}.`
        : `Unknown scan resolved. Existing Inventory quantity updated from ${previousQuantity} to ${newQuantity}.`,
      inventoryRecord,
      previousQuantity,
      newQuantity,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to resolve unknown scan." }, { status: 500 });
  }
}
