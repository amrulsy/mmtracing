import logger from './config/logger';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import path from 'path';
import { env } from './config/env';
import db from './config/db';
import { errorHandler } from './middleware/errorHandler';

// Import routes
import authRoutes from './modules/auth/auth.routes';
import pelangganAuthRoutes from './modules/pelanggan/pelanggan-auth.routes';
import woRoutes from './modules/work-order/wo.routes';
import pelangganRoutes from './modules/pelanggan/pelanggan.routes';
import kendaraanRoutes from './modules/kendaraan/kendaraan.routes';
import pembayaranRoutes from './modules/pembayaran/pembayaran.routes';
import mekanikRoutes from './modules/mekanik/mekanik.routes';
import sparepartRoutes from './modules/sparepart/sparepart.routes';
import jasaRoutes from './modules/jasa/jasa.routes';
import supplierRoutes from './modules/supplier/supplier.routes';
import inventarisRoutes from './modules/inventaris/inventaris.routes';
import garansiRoutes from './modules/garansi/garansi.routes';
import jadwalRoutes from './modules/jadwal/jadwal.routes';
import monitoringRoutes from './modules/monitoring/monitoring.routes';
import laporanRoutes from './modules/laporan/laporan.routes';
import loyaltyRoutes from './modules/loyalty/loyalty.routes';
import pengeluaranRoutes from './modules/pengeluaran/pengeluaran.routes';
import notifikasiRoutes from './modules/notifikasi/notifikasi.routes';
import inspeksiRoutes from './modules/inspeksi/inspeksi.routes';
import approvalRoutes from './modules/approval/approval.routes';
import settingsRoutes from './modules/settings/settings.routes';
import exportRoutes from './modules/settings/export.routes';
import whatsappRoutes from './modules/whatsapp/whatsapp.routes';
import logAktivitasRoutes from './modules/log-aktivitas/logAktivitas.routes';
import dashboardRoutes from './modules/dashboard/dashboard.routes';
import eventsRoutes from './modules/events/events.routes';
import searchRoutes from './modules/search/search.routes';
import landingRoutes from './modules/landing/landing.routes';
import bookingRoutes from './modules/booking/booking.routes';
import uploadRoutes from './modules/upload/upload.routes';
import bundleRoutes from './modules/service-bundles/bundle.routes';
import { serverAdapter } from './modules/whatsapp/bull-board';
import { whatsappService } from './modules/whatsapp/whatsapp.service';
import { initializeEventListeners } from './modules/events/event.listener';
import { startCronJobs } from './jobs/index';

const app = express();

// Initialize Event Listeners for Decoupling
initializeEventListeners();

startCronJobs();

// Initialize Queue Workers
import './modules/whatsapp/wa.queue';

// Auto-start WhatsApp Gateway if previously connected
whatsappService.init().catch(err => logger.error('[WhatsApp] Auto-init failed:', err));

import crypto from 'crypto';

// ==========================================
// MIDDLEWARE
// ==========================================
// Add Correlation ID / Request ID
app.use((req, res, next) => {
  const reqId = crypto.randomUUID();
  (req as any).id = reqId;
  res.setHeader('X-Request-Id', reqId);
  next();
});
// ==========================================
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ 
  origin: (origin, callback) => {
    // Allow requests with no origin (curl, Postman, server-side)
    if (!origin) return callback(null, true);
    // Allow production domains
    const allowedOrigins = [
      env.frontendUrl,
      'https://mmtracing.com',
      'https://www.mmtracing.com',
    ];
    // Allow all localhost and local network IPs in dev mode
    if (
      env.nodeEnv === 'development' && 
      (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin) ||
       /^https?:\/\/(192\.168|10|172\.(1[6-9]|2\d|3[01]))\.\d+\.\d+(:\d+)?$/.test(origin))
    ) {
      return callback(null, true);
    }
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true 
}));
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Static files (uploads)
app.use('/uploads', express.static(path.resolve(env.upload.dir)));

// ==========================================
// ROUTES
// ==========================================
const API = '/api/v1';

app.get(`${API}/health`, async (_req, res) => {
  const database = await db.checkHealth();
  res.status(database ? 200 : 503).json({
    success: database,
    message: database ? 'MMT Racing API is running [V3]' : 'Koneksi database tidak tersedia',
    database: database ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
  });
});

app.use(`${API}`, exportRoutes);
app.use(`${API}/auth`, authRoutes);
app.use(`${API}/customer-auth`, pelangganAuthRoutes);
app.use(`${API}/dashboard`, dashboardRoutes);
app.use(`${API}/wo`, woRoutes);
app.use(`${API}/work-order`, woRoutes);
app.use(`${API}/spk`, woRoutes);
app.use(`${API}/pelanggan`, pelangganRoutes);
app.use(`${API}/kendaraan`, kendaraanRoutes);
app.use(`${API}/pembayaran`, pembayaranRoutes);
app.use(`${API}/mekanik`, mekanikRoutes);
app.use(`${API}/sparepart`, sparepartRoutes);
app.use(`${API}/jasa`, jasaRoutes);
app.use(`${API}/supplier`, supplierRoutes);
app.use(`${API}/inventaris`, inventarisRoutes);
app.use(`${API}/garansi`, garansiRoutes);
app.use(`${API}/jadwal`, jadwalRoutes);
app.use(`${API}/monitoring`, monitoringRoutes);
app.use(`${API}/laporan`, laporanRoutes);
app.use(`${API}/loyalty`, loyaltyRoutes);
app.use(`${API}/pengeluaran`, pengeluaranRoutes);
app.use(`${API}/notifikasi`, notifikasiRoutes);
app.use(`${API}/inspeksi`, inspeksiRoutes);
app.use(`${API}/approval`, approvalRoutes);
app.use(`${API}/settings`, settingsRoutes);
app.use(`${API}/whatsapp`, whatsappRoutes);
app.use(`${API}/log-aktivitas`, logAktivitasRoutes);
app.use(`${API}/events`, eventsRoutes);
app.use(`${API}/search`, searchRoutes);
app.use(`${API}/landing`, landingRoutes);
app.use(`${API}/booking`, bookingRoutes);
app.use(`${API}/upload`, uploadRoutes);
app.use(`${API}/service-bundles`, bundleRoutes);

// Mounting Dashboard Queue (Bull-Board)
app.use(`${API}/admin/queues`, serverAdapter.getRouter());

// ==========================================
// ERROR HANDLING
// ==========================================
app.use(errorHandler);

export default app;
