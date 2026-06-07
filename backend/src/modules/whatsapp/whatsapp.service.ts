import logger from '../../config/logger';
import path from 'path';
import fs from 'fs';

// Baileys is ESM-only, load it dynamically with error handling
let baileysModule: any = null;
let baileysLoadError: Error | null = null;

async function loadBaileys() {
  if (baileysModule) return baileysModule;
  if (baileysLoadError) throw baileysLoadError;
  
  try {
    // Use Function constructor to avoid TypeScript module resolution issues
    const dynamicImport = new Function('modulePath', 'return import(modulePath)');
    baileysModule = await dynamicImport('@whiskeysockets/baileys');
    return baileysModule;
  } catch (err) {
    baileysLoadError = err as Error;
    logger.error('[WhatsApp] Failed to load Baileys (ESM module):', (err as Error).message);
    throw baileysLoadError;
  }
}

export class WhatsappService {
  private sock: any = null;
  public qrCode: string | null = null;
  public status: 'disconnected' | 'qr' | 'connecting' | 'connected' = 'disconnected';
  private initialized = false;

  constructor() {
    // Don't auto-init - wait for first API call
  }

  async init() {
    if (this.initialized) return;
    this.initialized = true;
    
    this.status = 'connecting';
    const authDir = path.resolve(process.cwd(), '.baileys');

    try {
      const baileys = await loadBaileys();
      const pino = (await import('pino')).default;
      
      if (!fs.existsSync(authDir)) {
        fs.mkdirSync(authDir, { recursive: true });
      }

      const { state, saveCreds } = await baileys.useMultiFileAuthState(authDir);
      const { version } = await baileys.fetchLatestBaileysVersion();

      this.sock = baileys.default({
        version,
        logger: pino({ level: 'silent' }) as any,
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
          if (!fs.existsSync(authDir)) {
            fs.mkdirSync(authDir, { recursive: true });
          }
          await saveCreds();
        } catch (err: any) {
          logger.error('[WhatsApp] Failed to save creds:', err.message);
        }
      });

      this.sock.ev.on('connection.update', (update: any) => {
        const { connection, lastDisconnect, qr } = update;
        
        if (qr) {
          this.qrCode = qr;
          this.status = 'qr';
        }

        if (connection === 'close') {
          this.status = 'disconnected';
          this.qrCode = null;
          
          const errorOutput = (lastDisconnect?.error as any)?.output;
          const statusCode = errorOutput?.statusCode;
          const shouldReconnect = statusCode !== baileys.DisconnectReason.loggedOut;
          
          // Logged out
          if (!shouldReconnect) {
            if (fs.existsSync(authDir)) fs.rmSync(authDir, { recursive: true, force: true });
            this.sock = null;
            this.initialized = false;
            this.init();
          } else {
            // Reconnect
            this.initialized = false;
            setTimeout(() => this.init(), 2000);
          }
        } else if (connection === 'open') {
          this.status = 'connected';
          this.qrCode = null;
        }
      });
    } catch (error) {
      logger.error('[WhatsApp] Init failed:', (error as Error).message);
      this.status = 'disconnected';
    }
  }

  async logout() {
    try {
      if (this.sock) {
        await this.sock.logout();
      }
    } catch (e) {
      // Ignored
    }
    
    this.sock = null;
    const authDir = path.resolve(process.cwd(), '.baileys');
    if (fs.existsSync(authDir)) fs.rmSync(authDir, { recursive: true, force: true });
    
    this.status = 'disconnected';
    this.qrCode = null;
    this.initialized = false;
    this.init(); 
  }

  async sendMessage(jid: string, text: string) {
    if (this.status !== 'connected' || !this.sock) {
      throw new Error('WhatsApp Gateway is not connected.');
    }
    // format jid like 628xxx@s.whatsapp.net
    if (!jid.includes('@')) {
      // standard Indonesian code wrapper if absent but user types 08
      if (jid.startsWith('0')) jid = '62' + jid.slice(1);
      jid = `${jid}@s.whatsapp.net`;
    }
    
    // Use a Promise.race to prevent infinite hanging
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("Timeout: Pesan tidak dapat dikirim. Koneksi ke server WhatsApp bermasalah."));
      }, 10000);

      this.sock.sendMessage(jid, { text })
        .then((res: any) => {
          clearTimeout(timeout);
          resolve(res);
        })
        .catch((err: any) => {
          clearTimeout(timeout);
          reject(err);
        });
    });
  }
}

export const whatsappService = new WhatsappService();
