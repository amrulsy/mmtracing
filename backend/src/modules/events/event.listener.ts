import { appEventEmitter } from '../../shared/eventEmitter';
import { sseManager } from '../../shared/sse';
import db from '../../config/db';
import crypto from 'crypto';
import { 
  notifySpkCreated, 
  notifySpkSelesai, 
  notifyProgressUpdate, 
  notifySpkKendala, 
  notifySpkBatal, 
  notifyGatePassReleased 
} from '../whatsapp/whatsapp.notification';

export function initializeEventListeners() {
  // SPK Created
  appEventEmitter.on('spk:created', (payload: { spkId: number, noSpk: string }) => {
    notifySpkCreated(payload.spkId);
  });

  // SPK Selesai
  appEventEmitter.on('spk:selesai', (payload: { spkId: number, noSpk: string, status: string, isLunas?: boolean, noInvoice?: string }) => {
    sseManager.broadcast('spk:selesai', payload);
    notifySpkSelesai(payload.spkId);

    if (payload.isLunas && payload.noInvoice) {
      notifyGatePassReleased(payload.spkId, payload.noInvoice);
    }
  });

  // SPK Kendala
  appEventEmitter.on('spk:kendala', async (payload: { spkId: number, noSpk: string, status: string }) => {
    sseManager.broadcast('spk:kendala', payload);
    
    const token = crypto.randomBytes(16).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    await db.insert('approval_tokens', {
      token,
      spkId: payload.spkId,
      expiresAt,
    });

    const approvalLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/approval/${token}`;
    notifySpkKendala(payload.spkId, approvalLink);
  });

  // SPK Batal
  appEventEmitter.on('spk:dibatalkan', (payload: { spkId: number, noSpk: string, status: string }) => {
    sseManager.broadcast('spk:updated', payload);
    notifySpkBatal(payload.spkId);
  });

  // SPK Progress Update
  appEventEmitter.on('spk:progress', (payload: { spkId: number, progress: number }) => {
    notifyProgressUpdate(payload.spkId);
  });

  // SPK Generic Update (dikerjakan)
  appEventEmitter.on('spk:updated', (payload: { spkId: number, noSpk: string, status: string }) => {
    sseManager.broadcast('spk:updated', payload);
  });

  // Inventaris: stok berubah (masuk/keluar/opname)
  appEventEmitter.on('inventaris:stok-update', (payload: { sparepartId: number, sparepartName: string, stokLama: number, stokBaru: number, type: string }) => {
    sseManager.broadcast('inventaris:stok-update', payload);
  });

  // New notification created
  appEventEmitter.on('notifikasi:new', (payload: { type: string, title: string, message: string }) => {
    sseManager.broadcast('notifikasi:new', payload);
  });
  
  console.log('[Event Listener] Initialized successfully');
}
