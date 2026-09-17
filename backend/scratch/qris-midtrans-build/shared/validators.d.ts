/**
 * Shared validators & normalizers for Indonesian formats.
 */
export declare const PLAT_REGEX: RegExp;
export declare function isValidPlat(plat: string): boolean;
/**
 * Normalisasi plat: uppercase + single space antara grup.
 *   "ab1234cd"  -> "AB 1234 CD"
 *   "b 1234"    -> "B 1234"
 *   "ad 12 a"   -> "AD 12 A"
 */
export declare function normalizePlat(plat: string): string;
/**
 * Normalisasi nomor telepon Indonesia ke format 62xxx (tanpa + atau 0 prefix).
 *   "08123456789"   -> "628123456789"
 *   "+628123456789" -> "628123456789"
 *   "628123456789"  -> "628123456789"
 *   "8123456789"    -> "628123456789"
 * String kosong dikembalikan apa adanya.
 */
export declare function normalizePhone(phone: string): string;
