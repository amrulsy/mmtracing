export declare const env: {
    port: number;
    nodeEnv: string;
    appUrl: string;
    frontendUrl: string;
    jwt: {
        secret: string;
        refreshSecret: string;
        expiresIn: string;
        refreshExpiresIn: string;
    };
    upload: {
        dir: string;
        maxFileSize: number;
    };
    wa: {
        sessionPath: string;
    };
};
