"use strict";
/**
 * Shared validators & normalizers for Indonesian formats.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PLAT_REGEX = void 0;
exports.isValidPlat = isValidPlat;
exports.normalizePlat = normalizePlat;
exports.normalizePhone = normalizePhone;
// Plat Nomor Indonesia:
//   - 1-2 huruf awal (wilayah, mis. "B", "AB", "AD")
//   - 1-4 digit angka
//   - 0-3 huruf akhir
//   Terima spasi atau tanpa spasi. Case-insensitive.
exports.PLAT_REGEX = /^[A-Z]{1,2}\s?\d{1,4}\s?[A-Z]{0,3}$/i;
function isValidPlat(plat) {
    return exports.PLAT_REGEX.test(plat.trim());
}
/**
 * Normalisasi plat: uppercase + single space antara grup.
 *   "ab1234cd"  -> "AB 1234 CD"
 *   "b 1234"    -> "B 1234"
 *   "ad 12 a"   -> "AD 12 A"
 */
function normalizePlat(plat) {
    const s = plat.trim().toUpperCase().replace(/\s+/g, '');
    const m = s.match(/^([A-Z]{1,2})(\d{1,4})([A-Z]{0,3})$/);
    if (!m)
        return s;
    return [m[1], m[2], m[3]].filter(Boolean).join(' ');
}
/**
 * Normalisasi nomor telepon Indonesia ke format 62xxx (tanpa + atau 0 prefix).
 *   "08123456789"   -> "628123456789"
 *   "+628123456789" -> "628123456789"
 *   "628123456789"  -> "628123456789"
 *   "8123456789"    -> "628123456789"
 * String kosong dikembalikan apa adanya.
 */
function normalizePhone(phone) {
    if (!phone)
        return phone;
    let s = phone.replace(/[\s\-.()]/g, '');
    if (s.startsWith('+'))
        s = s.slice(1);
    if (s.startsWith('0'))
        s = '62' + s.slice(1);
    else if (s.startsWith('8'))
        s = '62' + s;
    return s;
}
//# sourceMappingURL=validators.js.map