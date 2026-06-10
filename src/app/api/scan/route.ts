import { NextResponse } from "next/server";
import { extractNdc, formatNdc11 } from "@/lib/ndc";
import { TABLES, createRecord, findInventoryByNdc, incrementInventory } from "@/lib/airtable";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const rawScanValue = String(body.rawScanValue || body.barcode || "").trim();
    const action = body.action === "Add" ? "Add" : "Remove";
    const quantity = Math.max(1, Number(body.quantity || 1));
    const scannedBy = String(body.scannedBy || "").trim() || "Unknown";
    const notes = String(body.notes || "").trim();
    const ndc = extractNdc(rawScanValue);

    if (!rawScanValue || !ndc) {
      return NextResponse.json({ success: false, error: "Could not extract an 11-digit NDC from the scan." }, { status: 400 });
    }

    const inventory = await findInventoryByNdc(ndc);

    if (!inventory) {
      await createRecord(TABLES.unknownScans, {
        "Raw Scan Value": rawScanValue,
        NDC: ndc,
        Action: action,
        Quantity: quantity,
        "Scanned By": scannedBy,
        Notes: notes || "NDC not found in Inventory",
        Resolved: false,
      });
      return NextResponse.json({ success: true, unknownScan: true, rawScanValue, ndc, formattedNdc: formatNdc11(ndc), message: "NDC not found. Logged to Unknown Scans." });
    }

    const product = inventory.fields.Product;
    const productName = Array.isArray(product) ? product[0] : product;
    const { previous, next, change } = await incrementInventory(inventory, action, quantity);

    await createRecord(TABLES.scanLog, {
      "Inventory Item": [inventory.id],
      "Raw Scan Value": rawScanValue,
      NDC: ndc,
      Action: action,
      "Quantity Change": change,
      "Previous Quantity": previous,
      "New Quantity": next,
      "Scanned By": scannedBy,
      Notes: notes,
    });

    const minField = inventory.fields["Product Minimum Quantity"];
    const minimum = Array.isArray(minField) ? Number(minField[0] || 0) : Number(minField || 0);
    const lowStock = minimum > 0 && next <= minimum;

    if (lowStock && process.env.AIRTABLE_LOW_STOCK_ALERTS_TABLE) {
      try {
        await createRecord(TABLES.lowStockAlerts, {
          "Inventory Item": [inventory.id],
          NDC: ndc,
          "Current Quantity": next,
          "Minimum Quantity": minimum,
          Resolved: false,
        });
      } catch (_) {}
    }

    return NextResponse.json({ success: true, unknownScan: false, rawScanValue, ndc, formattedNdc: formatNdc11(ndc), productName, previousQuantity: previous, newQuantity: next, quantityChange: change, lowStock, minimumQuantity: minimum });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || "Scan failed" }, { status: 500 });
  }
}
