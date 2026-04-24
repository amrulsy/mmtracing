import { appEventEmitter } from '../../shared/eventEmitter';
import { sseManager } from '../../shared/sse';
import prisma from '../../config/database';
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
    // Notify whatsapp
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
    
    // Generate approval token
    const token = crypto.randomBytes(16).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    await prisma.approvalToken.create({
      data: {
        token,
        spkId: payload.spkId,
        expiresAt
      }
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
  
  console.log('[Event Listener] Initialized successfully');
}
