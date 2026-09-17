type Field = {
    tag: string;
    value: string;
};
export declare function crc16(value: string): string;
export declare function validateStaticQris(input: string): {
    payload: string;
    fields: Field[];
    merchantName: string;
    merchantCity: string;
};
export declare function dynamicQris(input: string, amount: number): string;
export {};
