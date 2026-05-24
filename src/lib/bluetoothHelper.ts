/**
 * bluetoothHelper.ts
 * Utilitas pusat untuk menangani komunikasi ESC/POS Bluetooth
 * dan manajemen printer default.
 */

const STORAGE_KEY = 'mmtracing_default_printer_id';
const KNOWN_PRINTERS_KEY = 'mmtracing_known_printers';
const SERVICE_UUIDS = [
  '000018f0-0000-1000-8000-00805f9b34fb', // Standard ESC/POS
  '0000ff00-0000-1000-8000-00805f9b34fb', // Common Thermal
  '49535343-fe7d-4ae5-8fa9-9fafd205e455'  // ISCC
];

export const bluetoothHelper = {
  _activeDevice: null as any,
  _activeCharacteristic: null as any,

  /**
   * Set active device di memory (hilang jika browser di refresh)
   */
  setActiveDevice(device: any) {
    this._activeDevice = device;
    if (device && device.id) {
      this.setDefaultPrinterId(device.id);
      this.saveToKnownPrinters(device);
    }
  },

  /**
   * Simpan metadata printer ke localStorage agar tidak "hilang"
   */
  saveToKnownPrinters(device: any) {
    try {
      const known = this.getKnownPrinters();
      const exists = known.find((p: any) => p.id === device.id);
      if (!exists) {
        known.push({ id: device.id, name: device.name || 'BT Printer' });
        localStorage.setItem(KNOWN_PRINTERS_KEY, JSON.stringify(known));
      }
    } catch (e) {
      console.error('Failed to save known printer', e);
    }
  },

  /**
   * Ambil daftar printer yang pernah terdaftar
   */
  getKnownPrinters() {
    try {
      const data = localStorage.getItem(KNOWN_PRINTERS_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  /**
   * Get active device dari memory
   */
  getActiveDevice() {
    return this._activeDevice;
  },

  /**
   * Cek apakah Web Bluetooth didukung
   */
  isSupported() {
    return !!(navigator as any).bluetooth;
  },

  /**
   * Ambil ID printer default dari localStorage
   */
  getDefaultPrinterId() {
    return localStorage.getItem(STORAGE_KEY);
  },

  /**
   * Simpan ID printer sebagai default
   */
  setDefaultPrinterId(id: string | null) {
    if (id) localStorage.setItem(STORAGE_KEY, id);
    else localStorage.removeItem(STORAGE_KEY);
  },

  /**
   * Ambil daftar perangkat yang sudah pernah diizinkan (authorized)
   */
  async getAuthorizedDevices() {
    let devices: any[] = [];
    
    // 1. Ambil dari browser (yang punya ijin aktif)
    if (this.isSupported() && (navigator as any).bluetooth.getDevices) {
      try {
        devices = await (navigator as any).bluetooth.getDevices();
      } catch (err) {
        console.error('Error getDevices:', err);
      }
    }

    // 2. Gabungkan dengan Known Printers dari localStorage
    const known = this.getKnownPrinters();
    
    // Pastikan tidak duplikat (utamakan objek asli dari browser jika ada)
    const combined = [...devices];
    known.forEach((k: any) => {
      const shown = combined.find(d => d.id === k.id);
      if (!shown) {
        combined.push({ ...k, isOffline: true }); // Tandai sebagai offline karena tidak ada di ijin aktif browser
      }
    });

    return combined;
  },

  /**
   * Cari perangkat baru via browser popup
   */
  async requestPrinter() {
    try {
      const device = await (navigator as any).bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: SERVICE_UUIDS
      });
      if (device) this.setActiveDevice(device);
      return device;
    } catch (err: any) {
      if (err.name === 'NotFoundError' || err.message.includes('User cancelled')) {
        console.log('Bluetooth discovery cancelled by user');
      } else {
        console.error('Bluetooth requestDevice failed:', err);
      }
      return null;
    }
  },

  /**
   * Hubungkan ke perangkat GATT dan cari writer characteristic
   */
  async connectAndGetWriter(device: any) {
    // Jika device hanya POJO (dari localStorage), kita harus request ulang agar dapat objek GATT asli
    if (!device.gatt) {
      const realDevice = await this.requestPrinter();
      if (!realDevice) throw new Error("Gagal menyambung kembali ke printer.");
      device = realDevice;
    }

    if (!device.gatt.connected) {
      await device.gatt.connect();
    }

    const services = await device.gatt.getPrimaryServices();
    let writer = null;

    for (const service of services) {
      try {
        const characteristics = await service.getCharacteristics();
        writer = characteristics.find((c: any) => c.properties.write || c.properties.writeWithoutResponse);
        if (writer) break;
      } catch (e) {
        // Skip restricted/incompatible services
      }
    }

    if (!writer) throw new Error("Printer ini tidak mendukung fitur cetak (ESC/POS).");
    this._activeCharacteristic = writer;
    return writer;
  },

  /**
   * Kirim data binary ke printer
   */
  async print(data: Uint8Array) {
    if (!this._activeDevice) throw new Error("Tidak ada printer yang aktif.");
    
    // Pastikan terhubung
    const writer = await this.connectAndGetWriter(this._activeDevice);
    
    // Chunking data (BLE MTU safe)
    const chunkSize = 20;
    for (let i = 0; i < data.length; i += chunkSize) {
      const chunk = data.slice(i, i + chunkSize);
      await writer.writeValue(chunk);
    }
  },

  /**
   * Memulai proses cetak secara otomatis (cari default atau request baru)
   */
  async autoPrint(data: Uint8Array) {
    // 1. Coba pake active device dulu
    if (this._activeDevice && this._activeDevice.gatt.connected) {
      await this.print(data);
      return;
    }

    // 2. Coba cari di authorized devices (berdasarkan saved ID)
    const savedId = this.getDefaultPrinterId();
    if (savedId) {
      const authorized = await this.getAuthorizedDevices();
      const device = authorized.find((d: any) => d.id === savedId);
      if (device) {
        this.setActiveDevice(device);
        await this.print(data);
        return;
      }
    }

    // 3. Kalo ga ada, request baru
    const device = await this.requestPrinter();
    if (device) {
      await this.print(data);
    }
  }
};
