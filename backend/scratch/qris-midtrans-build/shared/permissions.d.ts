/**
 * Single source of truth for all permission modules in the system.
 * Used by both backend middleware and frontend role management UI.
 */
export declare const PERMISSION_MODULES: readonly [{
    readonly key: "dashboard";
    readonly label: "Dashboard";
    readonly description: "Halaman utama & KPI";
}, {
    readonly key: "master";
    readonly label: "Master Data";
    readonly description: "Pelanggan, Kendaraan, Mekanik, Jasa, Sparepart, Supplier";
}, {
    readonly key: "wo";
    readonly label: "Work Order";
    readonly description: "Manajemen Work Order bengkel";
}, {
    readonly key: "monitoring";
    readonly label: "Monitoring";
    readonly description: "Monitoring pekerjaan bengkel";
}, {
    readonly key: "inventaris";
    readonly label: "Inventaris";
    readonly description: "Stok masuk/keluar, opname, retur";
}, {
    readonly key: "pembayaran";
    readonly label: "Pembayaran";
    readonly description: "Invoice, pembayaran, refund";
}, {
    readonly key: "pengeluaran";
    readonly label: "Pengeluaran";
    readonly description: "Pencatatan pengeluaran operasional";
}, {
    readonly key: "booking";
    readonly label: "Booking";
    readonly description: "Manajemen booking servis";
}, {
    readonly key: "garansi";
    readonly label: "Garansi";
    readonly description: "Garansi pekerjaan & sparepart";
}, {
    readonly key: "jadwal";
    readonly label: "Jadwal";
    readonly description: "Penjadwalan mekanik";
}, {
    readonly key: "loyalty";
    readonly label: "Loyalty";
    readonly description: "Program loyalitas pelanggan";
}, {
    readonly key: "laporan";
    readonly label: "Laporan";
    readonly description: "Laporan keuangan & operasional";
}, {
    readonly key: "settings";
    readonly label: "Pengaturan";
    readonly description: "User, role, konfigurasi sistem";
}];
export declare const PERMISSION_MODULE_KEYS: ("inventaris" | "pembayaran" | "dashboard" | "master" | "wo" | "monitoring" | "pengeluaran" | "booking" | "garansi" | "jadwal" | "loyalty" | "laporan" | "settings")[];
export declare const PERMISSION_LEVELS: {
    readonly none: 0;
    readonly view: 1;
    readonly edit: 2;
    readonly full: 3;
};
export type PermissionLevel = keyof typeof PERMISSION_LEVELS;
export type PermissionModuleKey = typeof PERMISSION_MODULE_KEYS[number];
