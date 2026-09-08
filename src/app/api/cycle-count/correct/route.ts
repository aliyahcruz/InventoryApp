import { NextRequest, NextResponse } from "next/server";
import {
  createRecord,
  findInventoryByNdc,
  tableNames,
  updateRecord,
} from "@/lib/airtable";
import { normalizeNdc } from "@/lib/ndc";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const rawScanValue = String(body.rawScanValue || "").trim();
    const ndc = normalizeNdc(String(body.ndc || ""));
    const correctedBy = String(body.correctedBy || "").trim();
    const notes = String(body.notes || "").trim();

    if (!ndc) {
      return NextResponse.json({ error: "NDC is required." }, { status: 400 });
    }

    if (!correctedBy) {
      return NextResponse.json(
        { error: "Corrected By is required." },
        { status: 400 }
      );
    }

    if (
      body.correctedQuantity === "" ||
      body.correctedQuantity === null ||
      body.correctedQuantity === undefined
    ) {
      return NextResponse.json(
        { error: "Corrected Quantity is required." },
        { status: 400 }
      );
    }

    const correctedQuantity = Number(body.correctedQuantity);

    if (!Number.isFinite(correctedQuantity) || correctedQuantity < 0) {
      return NextResponse.json(
        { error: "Corrected Quantity must be zero or greater." },
        { status: 400 }
      );
    }

    const inventoryRecord = await findInventoryByNdc(ndc);

    if (!inventoryRecord) {
      return NextResponse.json(
        { error: "Inventory item could not be found." },
        { status: 404 }
      );
    }

    const previousQuantity = Number(inventoryRecord.fields["Current Quantity"] || 0);

    // Update Inventory first; this is the source of truth.
    await updateRecord(tableNames.inventory, inventoryRecord.id, {
      "Current Quantity": correctedQuantity,
    });

    // Record the cycle-count audit entry.
    await createRecord(tableNames.cycleCountLog, {
      "Raw Scan Value": rawScanValue,
      "NDC": ndc,
      "Status": "Corrected",
      "Previous Quantity": previousQuantity,
      "Corrected Quantity": correctedQuantity,
      "Notes": notes,
      "Corrected By": correctedBy,
    });

    return NextResponse.json({
      success: true,
      message: "Inventory quantity corrected successfully.",
      ndc,
      previousQuantity,
      correctedQuantity,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Cycle count correction failed." },
      { status: 500 }
    );
  }
}
