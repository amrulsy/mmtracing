/** Regex plat Indonesia — sama dengan backend. */
export const PLAT_REGEX = /^[A-Z]{1,2}\s?\d{1,4}\s?[A-Z]{0,3}$/i;

export function isValidPlat(plat: string): boolean {
  return PLAT_REGEX.test(plat.trim());
}

export function normalizePlat(plat: string): string {
  const s = plat.trim().toUpperCase().replace(/\s+/g, "");
  const m = s.match(/^([A-Z]{1,2})(\d{1,4})([A-Z]{0,3})$/);
  if (!m) return s;
  return [m[1], m[2], m[3]].filter(Boolean).join(" ");
}
