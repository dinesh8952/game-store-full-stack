import redis from '../config/redis';
import prisma from '../config/db';
import logger from '../config/logger';

async function scanPlayCountKeys(): Promise<string[]> {
  const keys: string[] = [];
  let cursor = '0';
  do {
    const [next, found] = await redis.scan(cursor, 'MATCH', 'play_count:*', 'COUNT', '100');
    cursor = next;
    keys.push(...found);
  } while (cursor !== '0');
  return keys;
}

const FLUSH_LOCK_KEY = 'lock:play_count_flush';
const FLUSH_LOCK_TTL = 90; // seconds — longer than flush cycle to handle slow runs

async function flush() {
  // C5: Distributed lock — only one replica flushes at a time
  const locked = await redis.set(FLUSH_LOCK_KEY, '1', 'EX', FLUSH_LOCK_TTL, 'NX');
  if (!locked) {
    logger.debug('PlayCountFlush: Another instance is flushing, skipping');
    return;
  }

  try {
    const keys = await scanPlayCountKeys();
    if (keys.length === 0) return;

    let flushedAny = false;

    // Step 1: Read counts without deleting — safe, retryable if DB fails
    const entries: { key: string; gameId: string; increment: number }[] = [];
    for (const key of keys) {
      const value = await redis.get(key);
      const increment = parseInt(value || '0');
      if (increment <= 0) continue;
      entries.push({ key, gameId: key.replace('play_count:', ''), increment });
    }

    if (entries.length === 0) return;

    // Step 2: Persist to DB in a single transaction
    try {
      await prisma.$transaction(
        entries.map(({ gameId, increment }) =>
          prisma.game.update({ where: { id: gameId }, data: { playCount: { increment } } })
        )
      );

      // Step 3: Only remove from Redis AFTER successful DB write
      // DECRBY preserves any new INCRs that arrived between GET and now
      await Promise.all(entries.map(({ key, increment }) => redis.decrby(key, increment)));
      flushedAny = true;
    } catch (err) {
      // Transaction failed — keys untouched in Redis, full counts retried next cycle
      logger.error({ err }, 'PlayCountFlush: Transaction failed, counts retained for next cycle');
    }

    if (flushedAny) {
      await redis.del('dashboard:stats');
      logger.info('PlayCountFlush: Flushed counts and invalidated dashboard cache');
    }
  } finally {
    await redis.del(FLUSH_LOCK_KEY);
  }
}

let isFlushing = false;

export function startPlayCountFlush() {
  setInterval(async () => {
    if (isFlushing) return;
    isFlushing = true;
    try {
      await flush();
    } catch (err) {
      logger.error({ err }, 'PlayCountFlush: Unexpected error');
    } finally {
      isFlushing = false;
    }
  }, 60_000);

  logger.info('PlayCountFlush: Started — flushing every 60s');
}

export async function flushOnShutdown() {
  logger.info('PlayCountFlush: Running final flush before shutdown');
  try {
    await flush();
    logger.info('PlayCountFlush: Final flush complete');
  } catch (err) {
    logger.error({ err }, 'PlayCountFlush: Final flush failed');
  }
}
