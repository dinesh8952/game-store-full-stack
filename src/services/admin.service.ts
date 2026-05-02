import prisma from '../config/db';
import redis from '../config/redis';

const notFound = (msg: string) => Object.assign(new Error(msg), { statusCode: 404 });
const conflict = (msg: string) => Object.assign(new Error(msg), { statusCode: 409 });

export async function getPendingUsers(page: number = 1, limit: number = 10, status?: string) {
  const safePage = Math.max(1, page);
  const safeLimit = Math.min(Math.max(1, limit), 100);
  const skip = (safePage - 1) * safeLimit;
  const validStatuses = ['PENDING', 'APPROVED', 'REJECTED'];
  const where: any = { isSuperAdmin: false };
  if (status && validStatuses.includes(status)) {
    where.status = status;
  }
  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      include: { profile: true },
      orderBy: { createdAt: 'asc' },
      skip,
      take: safeLimit,
    }),
    prisma.user.count({ where }),
  ]);
  return { users, total, pages: Math.ceil(total / safeLimit), page: safePage, limit: safeLimit };
}

export async function approveUser(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw notFound('User not found');
  if (!user.profileComplete) throw conflict('Cannot approve — user has not completed their profile');
  if (user.status !== 'PENDING') throw conflict(`Cannot approve — user status is already ${user.status}`);

  await redis.del('dashboard:stats');
  return prisma.user.update({ where: { id: userId }, data: { status: 'APPROVED' } });
}

export async function rejectUser(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw notFound('User not found');
  if (user.status !== 'PENDING') throw conflict(`Cannot reject — user status is already ${user.status}`);

  await redis.del('dashboard:stats');
  return prisma.user.update({ where: { id: userId }, data: { status: 'REJECTED' } });
}
