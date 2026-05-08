import prisma from '../config/db';
import redis from '../config/redis';

const CACHE_KEY = 'dashboard:stats';
const CACHE_TTL = 60; // 60s — short TTL ensures fresher stats with minimal DB load

export async function getDashboardStats() {
  const cached = await redis.get(CACHE_KEY);
  if (cached) return JSON.parse(cached);

  // Scan Redis for games with buffered play counts not yet flushed to DB
  const redisKeys: string[] = [];
  let cursor = '0';
  do {
    const [next, found] = await redis.scan(cursor, 'MATCH', 'play_count:*', 'COUNT', '100');
    cursor = next;
    redisKeys.push(...found);
  } while (cursor !== '0');

  const redisGameIds = redisKeys.map(k => k.replace('play_count:', ''));

  const [totalUsers, pendingUsers, totalGames, dbTopGames, redisOnlyGames, approvedUsers, playCountAgg] = await Promise.all([
    prisma.user.count({ where: { isSuperAdmin: false } }),
    prisma.user.count({ where: { status: 'PENDING', isSuperAdmin: false, profileComplete: true } }),
    prisma.game.count(),
    // Top 20 by DB playCount — covers games that have been flushed
    prisma.game.findMany({
      orderBy: { playCount: 'desc' },
      take: 20,
      select: { id: true, name: true, genre: true, playCount: true },
    }),
    // Games that only exist in Redis buffer (not yet flushed) — may have high counts
    redisGameIds.length > 0
      ? prisma.game.findMany({
          where: { id: { in: redisGameIds } },
          select: { id: true, name: true, genre: true, playCount: true },
        })
      : Promise.resolve([]),
    // Approved users count
    prisma.user.count({ where: { status: 'APPROVED', isSuperAdmin: false } }),
    // Total DB play counts
    prisma.game.aggregate({ _sum: { playCount: true } }),
  ]);

  // Merge DB top-20 and Redis-only games, deduplicate by id
  const gameMap = new Map<string, { id: string; name: string; genre: string; playCount: number }>();
  [...dbTopGames, ...redisOnlyGames].forEach(g => gameMap.set(g.id, g));

  // Fetch Redis counts for the top games
  const ids = Array.from(gameMap.keys());
  const redisCountsForTop = ids.length > 0 ? await redis.mget(...ids.map(id => `play_count:${id}`)) : [];

  // Fetch ALL buffered Redis counts to get accurate totalPlays
  const allRedisCounts = redisKeys.length > 0 ? await redis.mget(...redisKeys) : [];
  const redisTotalPlays = allRedisCounts.reduce((acc, count) => acc + parseInt(count || '0'), 0);
  const dbTotalPlays = playCountAgg._sum.playCount || 0;
  const totalPlays = dbTotalPlays + redisTotalPlays;

  const allGamesWithRedis = ids.map((id, i) => {
    const game = gameMap.get(id)!;
    return { ...game, totalPlayCount: game.playCount + parseInt(redisCountsForTop[i] || '0') };
  });

  allGamesWithRedis.sort((a, b) => b.totalPlayCount - a.totalPlayCount);

  const stats = { totalUsers, pendingUsers, approvedUsers, totalGames, totalPlays, topGames: allGamesWithRedis.slice(0, 5) };
  await redis.setex(CACHE_KEY, CACHE_TTL, JSON.stringify(stats));
  return stats;
}
