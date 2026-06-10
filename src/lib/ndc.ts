export function onlyDigits(value: string): string {
  return String(value || "").replace(/\D/g, "");
}

export function normalizeNdc(value: string): string {
  const digits = onlyDigits(value);
  if (digits.length === 12) return digits.slice(0, 11);
  if (digits.length >= 11) return digits.slice(0, 11);
  return digits;
}

/**
 * Extracts an 11-digit NDC from medication barcode values.
 *
 * Handles:
 * - direct 11-digit NDC
 * - 12-digit value with a trailing check digit
 * - GS1 values containing AI 01 + 14-digit GTIN
 * - longer raw scan values containing an NDC-like 11-digit sequence
 *
 * Store Airtable Inventory.NDC as 11 digits only, no hyphens.
 */
export function extractNdc(rawValue: string): string {
  const digits = onlyDigits(rawValue);

  if (!digits) return "";

  // Already NDC11
  if (digits.length === 11) return digits;

  // Common scanner case: NDC11 + trailing check digit
  if (digits.length === 12) return digits.slice(0, 11);

  // GS1 AI 01 + 14 digit GTIN.
  // Common medication barcode example: 01 + GTIN + 17 expiration + 10 lot, etc.
  const gs1Match = digits.match(/01(\d{14})/);
  if (gs1Match) {
    const gtin14 = gs1Match[1];

    // For drug GTINs, the embedded NDC11 is commonly GTIN positions 3-13
    // after dropping packaging indicator / labeler prefix handling and trailing check digit.
    const candidateA = gtin14.slice(2, 13);
    if (candidateA.length === 11) return candidateA;

    const candidateB = gtin14.slice(3, 14);
    if (candidateB.length === 11) return candidateB;
  }

  // Long scan with extra characters before/after. Prefer first 11-digit window.
  for (let i = 0; i <= digits.length - 11; i++) {
    const candidate = digits.slice(i, i + 11);
    if (/^\d{11}$/.test(candidate)) return candidate;
  }

  return "";
}
