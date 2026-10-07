export function onlyDigits(value: string): string {
  return String(value || "").replace(/\D/g, "");
}

/**
 * Normalize a user-confirmed NDC/value for matching and storage.
 *
 * Do not force the value to 11 digits. Some workflows may use a corrected
 * identifier with a different length. The scanner extraction logic below
 * still provides an 11-digit best-effort suggestion when possible.
 */
export function normalizeNdc(value: string): string {
  return onlyDigits(value);
}

/**
 * Best-effort NDC extraction.
 *
 * This returns a suggestion only. The Detected NDC field remains editable
 * and may be submitted at a length other than 11 digits.
 */
export function extractNdc(rawValue: string): string {
  const digits = onlyDigits(rawValue);
  if (!digits) return "";

  if (digits.length === 11) return digits;

  // Common case: NDC11 plus a trailing check digit.
  if (digits.length === 12) return digits.slice(0, 11);

  // GS1 AI 01 followed by 14-digit GTIN.
  const gs1Match = digits.match(/01(\d{14})/);
  if (gs1Match) {
    const gtin14 = gs1Match[1];
    const candidates = [
      gtin14.slice(2, 13),
      gtin14.slice(3, 14),
      gtin14.slice(1, 12),
    ];

    const found = candidates.find(
      (candidate) => candidate.length === 11 && /^\d{11}$/.test(candidate)
    );
    if (found) return found;
  }

  // If there is a 12-digit contiguous segment, suggest the first 11 digits.
  for (let i = 0; i <= digits.length - 12; i++) {
    const candidate12 = digits.slice(i, i + 12);
    if (/^\d{12}$/.test(candidate12)) return candidate12.slice(0, 11);
  }

  // Last-resort suggestion only: first 11-digit window.
  for (let i = 0; i <= digits.length - 11; i++) {
    const candidate = digits.slice(i, i + 11);
    if (/^\d{11}$/.test(candidate)) return candidate;
  }

  // If no 11-digit suggestion is possible, return the digits that were read
  // so the user can edit them rather than receiving a blank field.
  return digits;
}
