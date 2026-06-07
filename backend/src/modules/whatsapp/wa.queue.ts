import { Queue, Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { whatsappService } from './whatsapp.service';
import logger from '../../config/logger';

const hasRedis = !!process.env.REDIS_URL;

let waQueue: any;
let waWorker: any;

if (hasRedis) {
  const connection = new IORedis(process.env.REDIS_URL as string, {
    maxRetriesPerRequest: null,
    retryStrategy(times) {
      if (times > 3) return null;
      return Math.min(times * 100, 5000);
    }
  });

  connection.on('error', (err: any) => {
    // Suppress spam
  });

  waQueue = new Queue('whatsapp-messages', { connection: connection as any });

  waWorker = new Worker('whatsapp-messages', async (job: Job) => {
    const { jid, text } = job.data;
    if (whatsappService.status !== 'connected') throw new Error('WhatsApp tidak terhubung');
    try {
      await whatsappService.sendMessage(jid, text);
      logger.info(`[WhatsApp Queue] Pesan berhasil dikirim ke ${jid}`);
    } catch (error: any) {
      logger.error(`[WhatsApp Queue] Gagal mengirim pesan ke ${jid}: ${error.message}`);
      throw error;
    }
  }, {
    connection: connection as any,
    limiter: { max: 1, duration: 1500 }
  });

  waWorker.on('failed', (job: Job | undefined, err: Error) => {
    logger.error(`[WhatsApp Worker] Job ${job?.id} gagal: ${err.message}`);
  });

  waWorker.on('error', () => {});
  waQueue.on('error', () => {});

} else {
  // Mode tanpa Redis: Langsung eksekusi tanpa antrean
  waQueue = {
    add: async (name: string, data: any, opts: any) => {
      setTimeout(async () => {
        try {
          if (whatsappService.status !== 'connected') return;
          await whatsappService.sendMessage(data.jid, data.text);
          logger.info(`[WhatsApp Fallback] Pesan berhasil dikirim ke ${data.jid}`);
        } catch (error: any) {
          logger.error(`[WhatsApp Fallback] Gagal mengirim pesan: ${error.message}`);
        }
      }, Math.random() * 2000); // delay random agar tidak kena rate limit
      return { id: `memory-${Date.now()}` };
    }
  };
}

export { waQueue, waWorker, hasRedis };


