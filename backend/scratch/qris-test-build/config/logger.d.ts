import winston from 'winston';
declare const logger: winston.Logger & {
    crit: winston.LeveledLogMethod;
};
export default logger;
