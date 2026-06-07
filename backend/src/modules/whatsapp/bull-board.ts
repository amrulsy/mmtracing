import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { waQueue, hasRedis } from './wa.queue';

// Inisialisasi adapter untuk Express
export const serverAdapter = new ExpressAdapter();

// Setup UI dashboard pada route spesifik
serverAdapter.setBasePath('/api/v1/admin/queues');

// Inisialisasi Bull-Board dengan antrean WhatsApp
createBullBoard({
  queues: hasRedis ? [new BullMQAdapter(waQueue)] : [],
  serverAdapter: serverAdapter,
});
