import winston from 'winston';
import { env } from './env';

// Override console methods to filter out spammy libsignal logs
const originalConsoleInfo = console.info;
console.info = function (...args: any[]) {
  const msg = typeof args[0] === 'string' ? args[0] : '';
  if (
    msg.includes('Closing session:') ||
    msg.includes('Opening session:') ||
    msg.includes('Removing old closed session:')
  ) {
    return; // Suppress libsignal session spam
  }
  originalConsoleInfo.apply(console, args);
};

const originalConsoleWarn = console.warn;
console.warn = function (...args: any[]) {
  const msg = typeof args[0] === 'string' ? args[0] : '';
  if (
    msg.includes('Session already closed') ||
    msg.includes('Session already open') ||
    msg.includes('Decrypted message with closed session')
  ) {
    return; // Suppress libsignal session spam
  }
  originalConsoleWarn.apply(console, args);
};

// Custom log levels: add 'crit' between 'error' and 'warn'
const customLevels = {
  levels: {
    error: 0,
    crit: 1,
    warn: 2,
    info: 3,
    http: 4,
    verbose: 5,
    debug: 6,
    silly: 7,
  },
  colors: {
    error: 'red',
    crit: 'red bold',
    warn: 'yellow',
    info: 'green',
    http: 'magenta',
    verbose: 'cyan',
    debug: 'white',
    silly: 'grey',
  },
};

winston.addColors(customLevels.colors);

const logger = winston.createLogger({
  levels: customLevels.levels,
  level: env.nodeEnv === 'development' ? 'debug' : 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'mmtracing-api' },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/critical.log', level: 'crit' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
}) as winston.Logger & { crit: winston.LeveledLogMethod };

if (env.nodeEnv === 'development') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.printf(({ timestamp, level, message, ...meta }) => {
        const metaStr = Object.keys(meta).length > 1 ? ` ${JSON.stringify(meta)}` : '';
        return `${timestamp} [${level}]: ${message}${metaStr}`;
      })
    ),
  }));
}

export default logger;

