export function onlyDigits(value: string): string {
  return String(value || "").replace(/\D/g, "");
}

export function normalizeNdc(value: string): string {
  const digits = onlyDigits(value);

  // Keep exactly what the user corrected when it is 11 digits.
  if (digits.length === 11) return digits;

  // Common case: NDC11 + trailing check digit.
  if (digits.length === 12) return digits.slice(0, 11);

  // Do not blindly slice longer values. Longer values may include leading AI,
  // GTIN, lot, expiration, or serial values. Use extractNdc instead.
  return digits;
}

/**
 * Best-effort NDC extraction.
 *
 * Important: this function returns a suggestion only.
 * The UI keeps the Detected NDC editable so the user can correct scans where
 * the barcode includes extra leading/trailing values.
 */
export function extractNdc(rawValue: string): string {
  const digits = onlyDigits(rawValue);
  if (!digits) return "";

  // Already NDC11.
  if (digits.length === 11) return digits;

  // NDC11 plus trailing check digit.
  if (digits.length === 12) return digits.slice(0, 11);

  // GS1 AI 01 followed by 14-digit GTIN.
  // Try the common NDC-containing windows inside the GTIN, but do not trim
  // arbitrary leading digits outside this GS1 pattern.
  const gs1Match = digits.match(/01(\d{14})/);
  if (gs1Match) {
    const gtin14 = gs1Match[1];

    const candidates = [
      gtin14.slice(2, 13),
      gtin14.slice(3, 14),
      gtin14.slice(1, 12),
    ];

    const found = candidates.find((candidate) => candidate.length === 11 && /^\d{11}$/.test(candidate));
    if (found) return found;
  }

  // If there is a 12-digit contiguous segment, assume it may be NDC11 + check digit.
  for (let i = 0; i <= digits.length - 12; i++) {
    const candidate12 = digits.slice(i, i + 12);
    if (/^\d{12}$/.test(candidate12)) {
      return candidate12.slice(0, 11);
    }
  }

  // Last-resort suggestion only: first 11-digit window.
  // User can edit this in the Detected NDC field before submitting.
  for (let i = 0; i <= digits.length - 11; i++) {
    const candidate = digits.slice(i, i + 11);
    if (/^\d{11}$/.test(candidate)) return candidate;
  }

  return "";
}
