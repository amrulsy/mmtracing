import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import path from 'path';
import { env } from './config/env';
import { errorHandler } from './middleware/errorHandler';

// Import routes
import authRoutes from './modules/auth/auth.routes';
import spkRoutes from './modules/spk/spk.routes';
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
import logAktivitasRoutes from './modules/log-aktivitas/logAktivitas.routes';
import dashboardRoutes from './modules/dashboard/dashboard.routes';
import eventsRoutes from './modules/events/events.routes';

const app = express();

// ==========================================
// MIDDLEWARE
// ==========================================
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: env.frontendUrl, credentials: true }));
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

app.get(`${API}/health`, (_req, res) => {
  res.json({ success: true, message: 'MM Tracing API is running', timestamp: new Date().toISOString() });
});

app.use(`${API}/auth`, authRoutes);
app.use(`${API}/dashboard`, dashboardRoutes);
app.use(`${API}/spk`, spkRoutes);
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
app.use(`${API}/log-aktivitas`, logAktivitasRoutes);
app.use(`${API}/events`, eventsRoutes);

// ==========================================
// ERROR HANDLING
// ==========================================
app.use(errorHandler);

export default app;
