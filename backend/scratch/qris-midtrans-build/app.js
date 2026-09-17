"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const logger_1 = __importDefault(require("./config/logger"));
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const compression_1 = __importDefault(require("compression"));
const path_1 = __importDefault(require("path"));
const env_1 = require("./config/env");
const db_1 = __importDefault(require("./config/db"));
const errorHandler_1 = require("./middleware/errorHandler");
// Import routes
const auth_routes_1 = __importDefault(require("./modules/auth/auth.routes"));
const pelanggan_auth_routes_1 = __importDefault(require("./modules/pelanggan/pelanggan-auth.routes"));
const wo_routes_1 = __importDefault(require("./modules/work-order/wo.routes"));
const pelanggan_routes_1 = __importDefault(require("./modules/pelanggan/pelanggan.routes"));
const kendaraan_routes_1 = __importDefault(require("./modules/kendaraan/kendaraan.routes"));
const pembayaran_routes_1 = __importDefault(require("./modules/pembayaran/pembayaran.routes"));
const mekanik_routes_1 = __importDefault(require("./modules/mekanik/mekanik.routes"));
const sparepart_routes_1 = __importDefault(require("./modules/sparepart/sparepart.routes"));
const jasa_routes_1 = __importDefault(require("./modules/jasa/jasa.routes"));
const supplier_routes_1 = __importDefault(require("./modules/supplier/supplier.routes"));
const inventaris_routes_1 = __importDefault(require("./modules/inventaris/inventaris.routes"));
const garansi_routes_1 = __importDefault(require("./modules/garansi/garansi.routes"));
const jadwal_routes_1 = __importDefault(require("./modules/jadwal/jadwal.routes"));
const monitoring_routes_1 = __importDefault(require("./modules/monitoring/monitoring.routes"));
const laporan_routes_1 = __importDefault(require("./modules/laporan/laporan.routes"));
const loyalty_routes_1 = __importDefault(require("./modules/loyalty/loyalty.routes"));
const pengeluaran_routes_1 = __importDefault(require("./modules/pengeluaran/pengeluaran.routes"));
const notifikasi_routes_1 = __importDefault(require("./modules/notifikasi/notifikasi.routes"));
const inspeksi_routes_1 = __importDefault(require("./modules/inspeksi/inspeksi.routes"));
const approval_routes_1 = __importDefault(require("./modules/approval/approval.routes"));
const settings_routes_1 = __importDefault(require("./modules/settings/settings.routes"));
const export_routes_1 = __importDefault(require("./modules/settings/export.routes"));
const whatsapp_routes_1 = __importDefault(require("./modules/whatsapp/whatsapp.routes"));
const logAktivitas_routes_1 = __importDefault(require("./modules/log-aktivitas/logAktivitas.routes"));
const dashboard_routes_1 = __importDefault(require("./modules/dashboard/dashboard.routes"));
const events_routes_1 = __importDefault(require("./modules/events/events.routes"));
const search_routes_1 = __importDefault(require("./modules/search/search.routes"));
const landing_routes_1 = __importDefault(require("./modules/landing/landing.routes"));
const booking_routes_1 = __importDefault(require("./modules/booking/booking.routes"));
const upload_routes_1 = __importDefault(require("./modules/upload/upload.routes"));
const bundle_routes_1 = __importDefault(require("./modules/service-bundles/bundle.routes"));
const bull_board_1 = require("./modules/whatsapp/bull-board");
const whatsapp_service_1 = require("./modules/whatsapp/whatsapp.service");
const event_listener_1 = require("./modules/events/event.listener");
const index_1 = require("./jobs/index");
const app = (0, express_1.default)();
// Initialize Event Listeners for Decoupling
(0, event_listener_1.initializeEventListeners)();
(0, index_1.startCronJobs)();
// Initialize Queue Workers
require("./modules/whatsapp/wa.queue");
// Auto-start WhatsApp Gateway if previously connected
whatsapp_service_1.whatsappService.init().catch(err => logger_1.default.error('[WhatsApp] Auto-init failed:', err));
const crypto_1 = __importDefault(require("crypto"));
// ==========================================
// MIDDLEWARE
// ==========================================
// Add Correlation ID / Request ID
app.use((req, res, next) => {
    const reqId = crypto_1.default.randomUUID();
    req.id = reqId;
    res.setHeader('X-Request-Id', reqId);
    next();
});
// ==========================================
app.use((0, helmet_1.default)({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        // Allow requests with no origin (curl, Postman, server-side)
        if (!origin)
            return callback(null, true);
        // Allow production domains
        const allowedOrigins = [
            env_1.env.frontendUrl,
            'https://mmtracing.com',
            'https://www.mmtracing.com',
        ];
        // Allow all localhost and local network IPs in dev mode
        if (env_1.env.nodeEnv === 'development' &&
            (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin) ||
                /^https?:\/\/(192\.168|10|172\.(1[6-9]|2\d|3[01]))\.\d+\.\d+(:\d+)?$/.test(origin))) {
            return callback(null, true);
        }
        if (allowedOrigins.includes(origin))
            return callback(null, true);
        callback(new Error('Not allowed by CORS'));
    },
    credentials: true
}));
app.use((0, compression_1.default)());
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true }));
app.use((0, morgan_1.default)('dev'));
// Static files (uploads)
app.use('/uploads', express_1.default.static(path_1.default.resolve(env_1.env.upload.dir)));
// ==========================================
// ROUTES
// ==========================================
const API = '/api/v1';
app.get(`${API}/health`, async (_req, res) => {
    const database = await db_1.default.checkHealth();
    res.status(database ? 200 : 503).json({
        success: database,
        message: database ? 'MMT Racing API is running [V3]' : 'Koneksi database tidak tersedia',
        database: database ? 'connected' : 'disconnected',
        timestamp: new Date().toISOString(),
    });
});
app.use(`${API}`, export_routes_1.default);
app.use(`${API}/auth`, auth_routes_1.default);
app.use(`${API}/customer-auth`, pelanggan_auth_routes_1.default);
app.use(`${API}/dashboard`, dashboard_routes_1.default);
app.use(`${API}/wo`, wo_routes_1.default);
app.use(`${API}/work-order`, wo_routes_1.default);
app.use(`${API}/spk`, wo_routes_1.default);
app.use(`${API}/pelanggan`, pelanggan_routes_1.default);
app.use(`${API}/kendaraan`, kendaraan_routes_1.default);
app.use(`${API}/pembayaran`, pembayaran_routes_1.default);
app.use(`${API}/mekanik`, mekanik_routes_1.default);
app.use(`${API}/sparepart`, sparepart_routes_1.default);
app.use(`${API}/jasa`, jasa_routes_1.default);
app.use(`${API}/supplier`, supplier_routes_1.default);
app.use(`${API}/inventaris`, inventaris_routes_1.default);
app.use(`${API}/garansi`, garansi_routes_1.default);
app.use(`${API}/jadwal`, jadwal_routes_1.default);
app.use(`${API}/monitoring`, monitoring_routes_1.default);
app.use(`${API}/laporan`, laporan_routes_1.default);
app.use(`${API}/loyalty`, loyalty_routes_1.default);
app.use(`${API}/pengeluaran`, pengeluaran_routes_1.default);
app.use(`${API}/notifikasi`, notifikasi_routes_1.default);
app.use(`${API}/inspeksi`, inspeksi_routes_1.default);
app.use(`${API}/approval`, approval_routes_1.default);
app.use(`${API}/settings`, settings_routes_1.default);
app.use(`${API}/whatsapp`, whatsapp_routes_1.default);
app.use(`${API}/log-aktivitas`, logAktivitas_routes_1.default);
app.use(`${API}/events`, events_routes_1.default);
app.use(`${API}/search`, search_routes_1.default);
app.use(`${API}/landing`, landing_routes_1.default);
app.use(`${API}/booking`, booking_routes_1.default);
app.use(`${API}/upload`, upload_routes_1.default);
app.use(`${API}/service-bundles`, bundle_routes_1.default);
// Mounting Dashboard Queue (Bull-Board)
app.use(`${API}/admin/queues`, bull_board_1.serverAdapter.getRouter());
// ==========================================
// ERROR HANDLING
// ==========================================
app.use(errorHandler_1.errorHandler);
exports.default = app;
//# sourceMappingURL=app.js.map