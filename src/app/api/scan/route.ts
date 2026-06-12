import { NextRequest, NextResponse } from "next/server";
import { createRecord, findInventoryByNdc, getMinimumQuantity, tableNames, updateRecord } from "@/lib/airtable";
import { extractNdc, normalizeNdc } from "@/lib/ndc";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const rawScanValue = String(body.rawScanValue || body.barcode || "");
    const userProvidedNdc = normalizeNdc(String(body.ndc || ""));
    const extractedNdc = extractNdc(rawScanValue);
    const ndc = userProvidedNdc || extractedNdc;

    const action = body.action === "Add" ? "Add" : "Remove";
    const quantity = Math.max(1, Number(body.quantity || 1));
    const scannedBy = String(body.scannedBy || process.env.DEFAULT_SCANNED_BY || "Inventory User");
    const notes = String(body.notes || "");

    if (!rawScanValue) {
      return NextResponse.json({ error: "Raw Scan Value is required." }, { status: 400 });
    }

    if (!ndc || ndc.length !== 11) {
      await createRecord(tableNames.unknownScans, {
        "Raw Scan Value": rawScanValue,
        "NDC": ndc || "",
        "Action": action,
        "Quantity": quantity,
        "Scanned By": scannedBy,
        "Notes": notes || "Could not determine a valid 11-digit NDC from raw scan value.",
        "Resolved": false,
      });

      return NextResponse.json({
        success: false,
        unknownScan: true,
        message: "A valid 11-digit NDC was not provided. Raw scan was logged for review.",
        rawScanValue,
        ndc: ndc || "",
      });
    }

    const inventoryRecord = await findInventoryByNdc(ndc);

    if (!inventoryRecord) {
      await createRecord(tableNames.unknownScans, {
        "Raw Scan Value": rawScanValue,
        "NDC": ndc,
        "Action": action,
        "Quantity": quantity,
        "Scanned By": scannedBy,
        "Notes": notes || "NDC not found in Inventory.",
        "Resolved": false,
      });

      return NextResponse.json({
        success: false,
        unknownScan: true,
        message: "NDC was not found in Inventory. It was logged in Unknown Scans for review.",
        rawScanValue,
        ndc,
      });
    }

    const previousQuantity = Number(inventoryRecord.fields["Current Quantity"] || 0);
    const quantityChange = action === "Add" ? quantity : -quantity;
    const newQuantity = previousQuantity + quantityChange;
    const minimumQuantity = await getMinimumQuantity(inventoryRecord);
    const barcodeLookupCount = Number(inventoryRecord.fields["Barcode Lookup Count"] || 0) + 1;

    await updateRecord(tableNames.inventory, inventoryRecord.id, {
      "Current Quantity": newQuantity,
      "Barcode Lookup Count": barcodeLookupCount,
    });

    // Field-safe Scan Log: this does not require linked fields like "Inventory Item" or "Product".
    await createRecord(tableNames.scanLog, {
      "Raw Scan Value": rawScanValue,
      "NDC": ndc,
      "Action": action,
      "Quantity Change": quantityChange,
      "Previous Quantity": previousQuantity,
      "New Quantity": newQuantity,
      "Scanned By": scannedBy,
      "Notes": notes,
    });

    const lowStock = minimumQuantity > 0 && newQuantity <= minimumQuantity;

    return NextResponse.json({
      success: true,
      message: "Inventory updated successfully.",
      rawScanValue,
      ndc,
      previousQuantity,
      newQuantity,
      minimumQuantity,
      lowStock,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Scan failed." }, { status: 500 });
  }
}
