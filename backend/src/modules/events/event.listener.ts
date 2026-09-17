import { appEventEmitter } from '../../shared/eventEmitter';
import { sseManager } from '../../shared/sse';
import db from '../../config/db';
import crypto from 'crypto';
import logger from '../../config/logger';
import { 
  notifyWoCreated, 
  notifyWoSelesai, 
  notifyProgressUpdate, 
  notifyWoKendala, 
  notifyWoBatal, 
  notifyGatePassReleased 
} from '../whatsapp/whatsapp.notification';

export function initializeEventListeners() {
  // WO Created
  appEventEmitter.on('wo:created', (payload: { woId: number, noWo: string }) => {
    notifyWoCreated(payload.woId);
  });

  // WO Selesai
  appEventEmitter.on('wo:selesai', async (payload: { woId: number, noWo: string, status: string, isLunas?: boolean, noInvoice?: string }) => {
    sseManager.broadcast('wo:selesai', payload);
    notifyWoSelesai(payload.woId);

    // Sync booking status to 'selesai' jika ada booking yang terhubung
    try {
      await db.execute(
        "UPDATE bookings SET status = 'selesai', updatedAt = NOW() WHERE woId = ? AND status != 'selesai'",
        [payload.woId]
      );
    } catch (err) {
      logger.error('[Event] Gagal sync booking status:', err);
    }

    if (payload.isLunas && payload.noInvoice) {
      notifyGatePassReleased(payload.woId, payload.noInvoice);
    }
  });

  // WO Kendala
  appEventEmitter.on('wo:kendala', async (payload: { woId: number, noWo: string, status: string }) => {
    sseManager.broadcast('wo:kendala', payload);
    
    const token = crypto.randomBytes(16).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    await db.insert('approval_tokens', {
      token,
      woId: payload.woId,
      expiresAt,
    });

    const approvalLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/approval/${token}`;
    notifyWoKendala(payload.woId, approvalLink);
  });

  // WO Batal
  appEventEmitter.on('wo:dibatalkan', (payload: { woId: number, noWo: string, status: string }) => {
    sseManager.broadcast('wo:updated', payload);
    notifyWoBatal(payload.woId);
  });

  // WO Progress Update
  appEventEmitter.on('wo:progress', (payload: { woId: number, progress: number }) => {
    notifyProgressUpdate(payload.woId);
  });

  // WO Generic Update (dikerjakan)
  appEventEmitter.on('wo:updated', (payload: { woId: number, noWo: string, status: string }) => {
    sseManager.broadcast('wo:updated', payload);
  });

  // Inventaris: stok berubah (masuk/keluar/opname)
  appEventEmitter.on('inventaris:stok-update', (payload: { sparepartId: number, sparepartName: string, stokLama: number, stokBaru: number, type: string }) => {
    sseManager.broadcast('inventaris:stok-update', payload);
  });

  // New notification created
  appEventEmitter.on('notifikasi:new', (payload: { type: string, title: string, message: string }) => {
    sseManager.broadcast('notifikasi:new', payload);
  });
  
  logger.info('[Event Listener] Initialized successfully');
}
