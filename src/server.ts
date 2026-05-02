import 'dotenv/config';
import app from './app';
import prisma from './config/db';
import redis from './config/redis';
import logger from './config/logger';
import { startPlayCountFlush, flushOnShutdown } from './jobs/playcount.flush';
import bcrypt from 'bcryptjs';

const PORT = process.env.PORT || 3000;

async function seedSuperAdmin() {
  const existing = await prisma.user.findFirst({ where: { isSuperAdmin: true } });
  if (existing) return;

  const passwordHash = await bcrypt.hash(process.env.SUPER_ADMIN_PASSWORD || 'Admin@123', 12);
  await prisma.user.create({
    data: {
      email: process.env.SUPER_ADMIN_EMAIL || 'admin@gamestore.com',
      passwordHash,
      isSuperAdmin: true,
      status: 'APPROVED' as const,
      profileComplete: true,
    },
  });
  logger.info('Seed: Super admin created');
}

async function shutdown(server: ReturnType<typeof app.listen>) {
  logger.info('Server: Shutting down...');
  // Promisify so flushOnShutdown runs only after all in-flight requests finish
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await flushOnShutdown();
  await prisma.$disconnect();
  redis.disconnect();
  logger.info('Server: Shutdown complete');
  process.exit(0);
}

async function bootstrap() {
  if (!process.env.JWT_SECRET) {
    logger.fatal('JWT_SECRET is not set. Exiting.');
    process.exit(1);
  }

  const weakPasswords = ['Admin@123', 'admin@123', 'password', 'admin', 'REPLACE_WITH_STRONG_PASSWORD'];
  const superAdminPass = process.env.SUPER_ADMIN_PASSWORD || '';
  if (!superAdminPass || weakPasswords.includes(superAdminPass) || superAdminPass.length < 12) {
    logger.fatal('SUPER_ADMIN_PASSWORD is missing or too weak. Use a strong password (12+ chars). Exiting.');
    process.exit(1);
  }

  await prisma.$connect();
  logger.info('DB: Connected');

  await redis.ping();
  logger.info('Redis: Ping OK');

  await seedSuperAdmin();
  startPlayCountFlush();

  const server = app.listen(PORT, () => {
    logger.info({ port: PORT }, 'Server: Running');
  });

  process.on('SIGTERM', () => shutdown(server));
  process.on('SIGINT', () => shutdown(server));
}

bootstrap().catch((err) => {
  logger.fatal({ err }, 'Bootstrap: Failed');
  process.exit(1);
});

process.on('unhandledRejection', (err) => {
  logger.error({ err }, 'Unhandled promise rejection');
});

process.on('uncaughtException', (err) => {
  logger.fatal({ err }, 'Uncaught exception — shutting down');
  process.exit(1);
});
