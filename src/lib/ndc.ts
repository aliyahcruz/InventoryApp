export function onlyDigits(value: string): string {
  return (value || "").replace(/\D/g, "");
}

export function normalizeNdc(value: string): string {
  return onlyDigits(value).slice(-11);
}

export function formatNdc11(ndc11: string): string {
  const n = normalizeNdc(ndc11);
  if (n.length !== 11) return n;
  return `${n.slice(0, 5)}-${n.slice(5, 9)}-${n.slice(9, 11)}`;
}

export function extractNdc(rawValue: string): string {
  const digits = onlyDigits(rawValue);
  if (!digits) return "";

  // GS1: AI 01 + 14-digit GTIN. For NDC/GTIN, the 11-digit NDC is commonly positions 4-14 of the GTIN.
  const gs1 = digits.match(/01(\d{14})/);
  if (gs1) {
    const gtin14 = gs1[1];
    const ndc11 = gtin14.slice(3, 14);
    if (ndc11.length === 11) return ndc11;
  }

  // Fallback: use first 11-digit sequence.
  const fallback = digits.match(/\d{11}/);
  return fallback ? fallback[0] : "";
}
