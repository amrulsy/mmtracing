import { EventEmitter } from 'events';

// Berfungsi sebagai Event Bus sentral untuk decoupling arsitektur (Notifikasi WA, SSE, Log Activity)
export const appEventEmitter = new EventEmitter();
