/** 1. Work Order Dibuat — called after WO creation */
export declare function notifyWoCreated(woId: number): Promise<void>;
/** 2. Progress Update — called after progress change */
export declare function notifyProgressUpdate(woId: number): Promise<void>;
/** 3. Selesai & Siap Ambil — called when WO status becomes 'selesai' */
export declare function notifyWoSelesai(woId: number): Promise<void>;
/** 4. Reminder Pembayaran — called when payment is partially paid */
export declare function notifyReminderPembayaran(pembayaranId: number): Promise<void>;
/** 5. Work Order Kendala — called when WO is pending due to technical issues */
export declare function notifyWoKendala(woId: number, approvalLink?: string): Promise<void>;
/** 6. Gate Pass & Garansi & Point — called when invoice LUNAS & WO Selesai */
export declare function notifyGatePassReleased(woId: number, invoiceNo: string): Promise<void>;
/** 7. Work Order Dibatalkan — called when WO cancelled */
export declare function notifyWoBatal(woId: number): Promise<void>;
/** 8. Booking Baru — called when new booking from landing page */
export declare function notifyBookingBaru(bookingId: number): Promise<void>;
/** 9. Mengirim OTP Login — called when customer requests OTP */
export declare function sendOtp(phone: string, otp: string): Promise<void>;
