import { NextResponse } from "next/server";
import { listRecords, tableNames } from "@/lib/airtable";

function numericCost(value: any): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (Array.isArray(value)) {
    if (value.length === 0 || value[0] === null || value[0] === undefined || value[0] === "") return null;
    return Number(value[0]);
  }
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function productLabel(product: any): string {
  const f = product?.fields || {};
  return (
    f["Product Name"] ||
    [f["Generic Name"], f["Brand Name"], f["Strength"], f["Dosage Form"]].filter(Boolean).join(" ") ||
    product?.id ||
    ""
  );
}

export async function GET() {
  try {
    const [inventoryRecords, productRecords] = await Promise.all([
      listRecords(tableNames.inventory),
      listRecords(tableNames.products),
    ]);

    const productsById: Record<string, any> = {};
    for (const product of productRecords) {
      productsById[product.id] = product;
    }

    const rows = inventoryRecords.map((record: any) => {
      const fields = record.fields || {};
      const productLink = fields["Product"];
      const productId = Array.isArray(productLink) ? productLink[0] : productLink;
      const product = productId ? productsById[productId] : null;
      const productFields = product?.fields || {};

      const currentQuantity = Number(fields["Current Quantity"] || 0);

      const priceEachGpo = numericCost(productFields["Price Each GPO"]);
      const priceEach340b = numericCost(productFields["Price Each 340B"]);
      const differenceGpo340b = numericCost(productFields["Difference GPO/340B"]);
      const midtown340b = numericCost(productFields["Midtown 340B"]);

      const valueOrNull = (cost: number | null) =>
        cost === null ? null : currentQuantity * cost;

      return {
        id: record.id,
        ndc: fields["NDC"] || "",
        productId: productId || "",
        productName: productLabel(product),
        location: fields["Location"] || "",
        currentQuantity,
        priceEachGpo,
        priceEach340b,
        differenceGpo340b,
        midtown340b,
        gpoValue: valueOrNull(priceEachGpo),
        value340b: valueOrNull(priceEach340b),
        differenceValue: valueOrNull(differenceGpo340b),
        midtown340bValue: valueOrNull(midtown340b),
      };
    });

    rows.sort((a, b) => String(a.productName || "").localeCompare(String(b.productName || "")));

    const totals = rows.reduce(
      (acc, row) => {
        if (row.gpoValue !== null) acc.gpoValue += row.gpoValue;
        if (row.value340b !== null) acc.value340b += row.value340b;
        if (row.differenceValue !== null) acc.differenceValue += row.differenceValue;
        if (row.midtown340bValue !== null) acc.midtown340bValue += row.midtown340bValue;
        return acc;
      },
      {
        gpoValue: 0,
        value340b: 0,
        differenceValue: 0,
        midtown340bValue: 0,
      }
    );

    return NextResponse.json({ rows, totals });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to load inventory value." }, { status: 500 });
  }
}
