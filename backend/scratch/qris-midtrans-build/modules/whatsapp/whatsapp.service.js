"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.whatsappService = exports.WhatsappService = void 0;
const logger_1 = __importDefault(require("../../config/logger"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
// Baileys is ESM-only, load it dynamically with error handling
let baileysModule = null;
let baileysLoadError = null;
async function loadBaileys() {
    if (baileysModule)
        return baileysModule;
    if (baileysLoadError)
        throw baileysLoadError;
    try {
        // Use Function constructor to avoid TypeScript module resolution issues
        const dynamicImport = new Function('modulePath', 'return import(modulePath)');
        baileysModule = await dynamicImport('@whiskeysockets/baileys');
        return baileysModule;
    }
    catch (err) {
        baileysLoadError = err;
        logger_1.default.error('[WhatsApp] Failed to load Baileys (ESM module):', err.message);
        throw baileysLoadError;
    }
}
class WhatsappService {
    constructor() {
        this.sock = null;
        this.qrCode = null;
        this.status = 'disconnected';
        this.initialized = false;
        // Don't auto-init - wait for first API call
    }
    async init() {
        if (this.initialized)
            return;
        this.initialized = true;
        this.status = 'connecting';
        const authDir = path_1.default.resolve(process.cwd(), '.baileys');
        try {
            const baileys = await loadBaileys();
            const dummyLogger = {
                level: 'silent',
                child: () => dummyLogger,
                trace: () => { }, debug: () => { }, info: () => { }, warn: () => { }, error: () => { }, fatal: () => { }
            };
            if (!fs_1.default.existsSync(authDir)) {
                fs_1.default.mkdirSync(authDir, { recursive: true });
            }
            const { state, saveCreds } = await baileys.useMultiFileAuthState(authDir);
            const { version } = await baileys.fetchLatestBaileysVersion();
            this.sock = baileys.default({
                version,
                logger: dummyLogger,
                printQRInTerminal: false,
                auth: state,
                syncFullHistory: false,
                markOnlineOnConnect: true,
                generateHighQualityLinkPreview: false,
                browser: ['MMT Racing Gateway', 'Chrome', '10.0.0']
            });
            this.sock.ev.on('creds.update', async () => {
                try {
                    // Ensure directory exists before saving, just in case it was deleted
                    if (!fs_1.default.existsSync(authDir)) {
                        fs_1.default.mkdirSync(authDir, { recursive: true });
                    }
                    await saveCreds();
                }
                catch (err) {
                    logger_1.default.error('[WhatsApp] Failed to save creds:', err.message);
                }
            });
            this.sock.ev.on('connection.update', (update) => {
                const { connection, lastDisconnect, qr } = update;
                if (qr) {
                    this.qrCode = qr;
                    this.status = 'qr';
                }
                if (connection === 'close') {
                    this.status = 'disconnected';
                    this.qrCode = null;
                    const errorOutput = lastDisconnect?.error?.output;
                    const statusCode = errorOutput?.statusCode;
                    const shouldReconnect = statusCode !== baileys.DisconnectReason.loggedOut;
                    // Logged out
                    if (!shouldReconnect) {
                        if (fs_1.default.existsSync(authDir))
                            fs_1.default.rmSync(authDir, { recursive: true, force: true });
                        this.sock = null;
                        this.initialized = false;
                        this.init();
                    }
                    else {
                        // Reconnect
                        this.initialized = false;
                        setTimeout(() => this.init(), 2000);
                    }
                }
                else if (connection === 'open') {
                    this.status = 'connected';
                    this.qrCode = null;
                }
            });
        }
        catch (error) {
            logger_1.default.error('[WhatsApp] Init failed:', error.message);
            this.status = 'disconnected';
        }
    }
    async logout() {
        try {
            if (this.sock) {
                await this.sock.logout();
            }
        }
        catch (e) {
            // Ignored
        }
        this.sock = null;
        const authDir = path_1.default.resolve(process.cwd(), '.baileys');
        if (fs_1.default.existsSync(authDir))
            fs_1.default.rmSync(authDir, { recursive: true, force: true });
        this.status = 'disconnected';
        this.qrCode = null;
        this.initialized = false;
        this.init();
    }
    async sendMessage(jid, text) {
        if (this.status !== 'connected' || !this.sock) {
            throw new Error('WhatsApp Gateway is not connected.');
        }
        // format jid like 628xxx@s.whatsapp.net
        if (!jid.includes('@')) {
            // standard Indonesian code wrapper if absent but user types 08
            if (jid.startsWith('0'))
                jid = '62' + jid.slice(1);
            jid = `${jid}@s.whatsapp.net`;
        }
        // Use a Promise.race to prevent infinite hanging
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error("Timeout: Pesan tidak dapat dikirim. Koneksi ke server WhatsApp bermasalah."));
            }, 10000);
            this.sock.sendMessage(jid, { text })
                .then((res) => {
                clearTimeout(timeout);
                resolve(res);
            })
                .catch((err) => {
                clearTimeout(timeout);
                reject(err);
            });
        });
    }
}
exports.WhatsappService = WhatsappService;
exports.whatsappService = new WhatsappService();
//# sourceMappingURL=whatsapp.service.js.map