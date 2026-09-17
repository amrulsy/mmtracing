import IORedis from 'ioredis';
export declare const redis: IORedis;
export declare const safeSetex: (key: string, seconds: number, value: string) => Promise<"OK">;
export declare const safeGet: (key: string) => Promise<string | null>;
export declare const safeDel: (key: string) => Promise<number>;
