import { NextResponse } from "next/server";
import { createLowStockAlert, createScanLog, createUnknownScan, findInventoryByBarcode, updateInventoryQuantity } from "../../../lib/airtable";

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

    if (!item) {
      await createUnknownScan({
        Barcode: barcode,
        Action: action,
        Quantity: quantity,
        "Scanned By": scannedBy || "Unknown",
        Notes: notes || "Barcode not found in inventory.",
        Resolved: false
      });

      return NextResponse.json({
        success: true,
        unknownScan: true,
        barcode,
        action,
        quantity,
        message: "Barcode was not found in inventory. It was logged in Unknown Scans for review. Inventory was not updated."
      });
    }

    const itemName = item.fields["Item Name"] || "Unnamed Item";
    const previousQuantity = Number(item.fields["Current Quantity"] || 0);
    const minimumQuantity = Number(item.fields["Minimum Quantity"] || 0);
    const quantityChange = action === "Remove" ? -quantity : quantity;
    const newQuantity = previousQuantity + quantityChange;
    const lowStock = minimumQuantity > 0 && newQuantity < minimumQuantity;

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

    let lowStockAlertLogged = false;
    let lowStockAlertError = "";
    if (lowStock) {
      try {
        await createLowStockAlert({
          Barcode: barcode,
          "Item Name": itemName,
          "Current Quantity": newQuantity,
          "Minimum Quantity": minimumQuantity,
          "Scanned By": scannedBy || "Unknown",
          Resolved: false,
          Notes: `Low stock after ${action.toLowerCase()} scan. Previous quantity: ${previousQuantity}. New quantity: ${newQuantity}.`
        });
        lowStockAlertLogged = true;
      } catch (alertError) {
        lowStockAlertError = alertError instanceof Error ? alertError.message : "Low stock alert could not be logged.";
      }
    }

    return NextResponse.json({
      success: true,
      unknownScan: false,
      lowStock,
      lowStockAlertLogged,
      lowStockAlertError,
      item: { id: item.id, barcode, itemName, previousQuantity, newQuantity, minimumQuantity, quantityChange, action, lowStock }
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}
