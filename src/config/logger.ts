import pino from 'pino';
import pretty from 'pino-pretty';
import fs from 'fs';
import path from 'path';

const isDev = process.env.NODE_ENV !== 'production';
const logDir = path.join(process.cwd(), 'logs');

if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });

const fileStream = fs.createWriteStream(path.join(logDir, 'app.log'), { flags: 'a' });

const streams: pino.StreamEntry[] = [
  { stream: isDev ? pretty({ colorize: true, translateTime: 'SYS:standard' }) : process.stdout },
  { stream: fileStream },
];

const logger = pino({ level: process.env.LOG_LEVEL || 'info' }, pino.multistream(streams));

export default logger;
