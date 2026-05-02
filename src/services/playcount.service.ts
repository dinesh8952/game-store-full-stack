import redis from '../config/redis';
import prisma from '../config/db';

export async function incrementPlayCount(gameId: string, userId: string) {
  const game = await prisma.game.findUnique({ where: { id: gameId, isActive: true } });
  if (!game) throw new Error('Game not found or inactive');

  await Promise.all([
    redis.incr(`play_count:${gameId}`),
    prisma.gamePlay.create({ data: { userId, gameId } }),
  ]);
}

export async function getTotalPlayCount(gameId: string, dbCount: number) {
  const redisCount = await redis.get(`play_count:${gameId}`);
  return dbCount + parseInt(redisCount || '0');
}
