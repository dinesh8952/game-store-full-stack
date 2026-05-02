import { Genre } from '@prisma/client';
import prisma from '../config/db';
import redis from '../config/redis';

const LIMIT = 12;

export async function getAllGames(page: number) {
  const safePage = Math.max(1, page);
  const skip = (safePage - 1) * LIMIT;
  const [games, total] = await Promise.all([
    prisma.game.findMany({ skip, take: LIMIT, orderBy: { createdAt: 'desc' } }),
    prisma.game.count(),
  ]);

  // Merge Redis buffered play counts (same as getActiveGames)
  const redisKeys = games.map(g => `play_count:${g.id}`);
  const redisCounts = redisKeys.length > 0 ? await redis.mget(...redisKeys) : [];
  const gamesWithCount = games.map((game, i) => ({
    ...game,
    totalPlayCount: game.playCount + parseInt(redisCounts[i] || '0'),
  }));

  return { games: gamesWithCount, total, pages: Math.ceil(total / LIMIT), page };
}


export async function getActiveGames(page: number, genre?: Genre) {
  const where = { isActive: true, ...(genre ? { genre } : {}) };
  const safePage = Math.max(1, page);
  const skip = (safePage - 1) * LIMIT;

  const [games, total] = await Promise.all([
    prisma.game.findMany({ where, skip, take: LIMIT, orderBy: { createdAt: 'desc' } }),
    prisma.game.count({ where }),
  ]);

  // One Redis call for all games on this page — mget is O(N) but single round trip
  const redisKeys = games.map(g => `play_count:${g.id}`);
  const redisCounts = redisKeys.length > 0 ? await redis.mget(...redisKeys) : [];

  const gamesWithCount = games.map((game, i) => ({
    ...game,
    totalPlayCount: game.playCount + parseInt(redisCounts[i] || '0'),
  }));

  return { games: gamesWithCount, total, pages: Math.ceil(total / LIMIT), page: safePage };
}

export async function getGameById(id: string) {
  return prisma.game.findUnique({ where: { id } });
}

export async function createGame(data: {
  name: string;
  description: string;
  genre: Genre;
  thumbnailUrl: string;
  maxPlayers: number;
  isActive: boolean;
}) {
  await redis.del('dashboard:stats');
  return prisma.game.create({ data });
}

export async function updateGame(id: string, data: {
  name: string;
  description: string;
  genre: Genre;
  thumbnailUrl: string;
  maxPlayers: number;
  isActive: boolean;
}) {
  await redis.del('dashboard:stats');
  return prisma.game.update({ where: { id }, data });
}

export async function deleteGame(id: string) {
  await redis.del('dashboard:stats');
  await redis.del(`play_count:${id}`);
  return prisma.game.update({ where: { id }, data: { isActive: false } });
}
