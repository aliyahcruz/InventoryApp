import { NextResponse } from "next/server";
import {
  createScanLog,
  createUnknownScan,
  findInventoryByBarcode,
  updateInventoryQuantity
} from "../../../lib/airtable";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const barcode = String(body.barcode || "").trim();
    const action = String(body.action || "Remove");
    const quantity = Number(body.quantity || 1);
    const scannedBy = String(body.scannedBy || "Unknown").trim();
    const notes = String(body.notes || "").trim();

    if (!barcode) return NextResponse.json({ error: "Barcode is required." }, { status: 400 });
    if (!Number.isFinite(quantity) || quantity <= 0) return NextResponse.json({ error: "Quantity must be greater than 0." }, { status: 400 });
    if (!["Add", "Remove"].includes(action)) return NextResponse.json({ error: "Action must be Add or Remove." }, { status: 400 });

    const item = await findInventoryByBarcode(barcode);

    // Requested edit #1: unknown barcodes are logged to Unknown Scans, not rejected.
    if (!item) {
      await createUnknownScan({
        Barcode: barcode,
        "Scanned By": scannedBy || "Unknown",
        Notes: notes || `Barcode not found in inventory. Intended action: ${action}; quantity: ${quantity}.`,
        Resolved: false
      });

      return NextResponse.json({
        success: true,
        unknownScan: true,
        barcode,
        message: "Barcode was not found in inventory. It was logged in Unknown Scans for review. Inventory was not updated."
      });
    }

    const itemName = item.fields["Item Name"] || "Unnamed Item";
    const previousQuantity = Number(item.fields["Current Quantity"] || 0);
    const quantityChange = action === "Remove" ? -quantity : quantity;
    const newQuantity = previousQuantity + quantityChange;

    if (newQuantity < 0) {
      return NextResponse.json({ error: `Not enough inventory. Current quantity is ${previousQuantity}.` }, { status: 400 });
    }

    await updateInventoryQuantity(item.id, newQuantity);

    await createScanLog({
      Barcode: barcode,
      "Item Name": itemName,
      Action: action,
      "Quantity Change": quantityChange,
      "Previous Quantity": previousQuantity,
      "New Quantity": newQuantity,
      "Scanned By": scannedBy || "Unknown",
      Notes: notes
    });

    return NextResponse.json({
      success: true,
      unknownScan: false,
      item: { id: item.id, barcode, itemName, previousQuantity, newQuantity, quantityChange, action }
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}
