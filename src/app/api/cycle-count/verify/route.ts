import { NextRequest, NextResponse } from "next/server";
import { createRecord, findInventoryByNdc, tableNames } from "@/lib/airtable";
import { normalizeNdc } from "@/lib/ndc";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rawScanValue = String(body.rawScanValue || "").trim();
    const ndc = normalizeNdc(String(body.ndc || ""));

    if (!ndc) {
      return NextResponse.json({ error: "NDC is required." }, { status: 400 });
    }

    const inventoryRecord = await findInventoryByNdc(ndc);
    if (!inventoryRecord) {
      return NextResponse.json(
        { error: "Inventory item could not be found." },
        { status: 404 }
      );
    }

    const currentQuantity = Number(inventoryRecord.fields["Current Quantity"] || 0);

    await createRecord(tableNames.cycleCountLog, {
      "Raw Scan Value": rawScanValue,
      "NDC": ndc,
      "Status": "OK",
      "Previous Quantity": currentQuantity,
      "Corrected Quantity": currentQuantity,
      "Notes": "",
      "Corrected By": "",
    });

    return NextResponse.json({
      success: true,
      message: "Cycle count marked as correct.",
      ndc,
      currentQuantity,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Could not record cycle count." },
      { status: 500 }
    );
  }
}
