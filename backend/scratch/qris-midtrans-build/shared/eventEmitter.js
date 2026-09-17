"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.appEventEmitter = void 0;
const events_1 = require("events");
// Berfungsi sebagai Event Bus sentral untuk decoupling arsitektur (Notifikasi WA, SSE, Log Activity)
exports.appEventEmitter = new events_1.EventEmitter();
//# sourceMappingURL=eventEmitter.js.map