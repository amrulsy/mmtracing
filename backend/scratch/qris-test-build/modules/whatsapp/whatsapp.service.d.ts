export declare class WhatsappService {
    private sock;
    qrCode: string | null;
    status: 'disconnected' | 'qr' | 'connecting' | 'connected';
    private initialized;
    constructor();
    init(): Promise<void>;
    logout(): Promise<void>;
    sendMessage(jid: string, text: string): Promise<unknown>;
}
export declare const whatsappService: WhatsappService;
