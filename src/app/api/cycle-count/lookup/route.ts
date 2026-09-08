import { NextRequest, NextResponse } from "next/server";
import {
  findBarcodeMappingByRawScan,
  findInventoryByNdc,
  listRecords,
  tableNames,
} from "@/lib/airtable";
import { extractNdc, normalizeNdc } from "@/lib/ndc";

function productLabel(product: any): string {
  const f = product?.fields || {};
  return (
    f["Product Name"] ||
    [f["Generic Name"], f["Brand Name"], f["Strength"], f["Dosage Form"]]
      .filter(Boolean)
      .join(" ") ||
    product?.id ||
    ""
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rawScanValue = String(body.rawScanValue || body.barcode || "").trim();

    if (!rawScanValue) {
      return NextResponse.json(
        { error: "Raw Scan Value is required." },
        { status: 400 }
      );
    }

    const barcodeMapping = await findBarcodeMappingByRawScan(rawScanValue);
    const mappedNdc = barcodeMapping
      ? normalizeNdc(String(barcodeMapping.fields["Corrected NDC"] || ""))
      : "";
    const extractedNdc = extractNdc(rawScanValue);
    const ndc = mappedNdc || extractedNdc;

    if (!ndc) {
      return NextResponse.json({
        found: false,
        rawScanValue,
        ndc: "",
        message: "No NDC could be determined from this scan.",
      });
    }

    const inventoryRecord = await findInventoryByNdc(ndc);

    if (!inventoryRecord) {
      return NextResponse.json({
        found: false,
        rawScanValue,
        ndc,
        message: "This NDC was not found in Inventory.",
        usedBarcodeMapping: !!mappedNdc,
      });
    }

    const productLinks = inventoryRecord.fields["Product"];
    const productId = Array.isArray(productLinks) ? productLinks[0] : productLinks;

    let productName = "";
    if (productId) {
      const products = await listRecords(tableNames.products);
      const product = products.find((p: any) => p.id === productId);
      if (product) productName = productLabel(product);
    }

    return NextResponse.json({
      found: true,
      rawScanValue,
      ndc,
      inventoryRecordId: inventoryRecord.id,
      productId: productId || "",
      productName,
      currentQuantity: Number(inventoryRecord.fields["Current Quantity"] || 0),
      location: inventoryRecord.fields["Location"] || "",
      usedBarcodeMapping: !!mappedNdc,
      message: "Inventory item found.",
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Cycle count lookup failed." },
      { status: 500 }
    );
  }
}
