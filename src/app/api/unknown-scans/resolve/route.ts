import { NextResponse } from "next/server";
import { createInventory, getUnknownScan, markUnknownScanResolved } from "../../../../lib/airtable";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const unknownScanId = String(body.unknownScanId || "").trim();
    const barcode = String(body.barcode || "").trim();
    const itemName = String(body.itemName || "").trim();
    const currentQuantity = Number(body.currentQuantity || 0);
    const minimumQuantity = Number(body.minimumQuantity || 0);
    const location = String(body.location || "").trim();

    if (!unknownScanId) return NextResponse.json({ error: "Unknown scan ID is required." }, { status: 400 });
    if (!barcode) return NextResponse.json({ error: "Barcode is required." }, { status: 400 });
    if (!itemName) return NextResponse.json({ error: "Item Name is required." }, { status: 400 });
    if (!Number.isFinite(currentQuantity) || currentQuantity < 0) return NextResponse.json({ error: "Current Quantity must be 0 or greater." }, { status: 400 });

    await getUnknownScan(unknownScanId);

    await createInventory({
      Barcode: barcode,
      "Item Name": itemName,
      "Current Quantity": currentQuantity,
      "Minimum Quantity": Number.isFinite(minimumQuantity) ? minimumQuantity : 0,
      ...(location ? { Location: location } : {}),
      Active: true
    });

    await markUnknownScanResolved(unknownScanId, `Resolved by adding ${itemName} to Inventory.`);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}
