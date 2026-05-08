jest.mock('../src/config/db', () => ({
  __esModule: true,
  default: {
    game: { findUnique: jest.fn(), update: jest.fn() },
    gamePlay: { create: jest.fn() },
    $transaction: jest.fn(),
  },
}));

jest.mock('../src/config/redis', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    set: jest.fn(),
    incr: jest.fn(),
    decrby: jest.fn(),
    del: jest.fn(),
    scan: jest.fn(),
    ping: jest.fn(),
    exists: jest.fn().mockResolvedValue(0),
    disconnect: jest.fn(),
  },
}));

import prisma from '../src/config/db';
import redis from '../src/config/redis';
import * as playcountService from '../src/services/playcount.service';

const mockGame = prisma.game as jest.Mocked<typeof prisma.game>;
const mockGamePlay = prisma.gamePlay as jest.Mocked<typeof prisma.gamePlay>;
const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockRedis = redis as jest.Mocked<typeof redis>;

describe('PlayCount - incrementPlayCount', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('increments Redis counter when game is active', async () => {
    mockGame.findUnique.mockResolvedValue({ id: 'game-1', isActive: true } as any);
    mockGamePlay.create.mockResolvedValue({} as any);
    mockRedis.incr.mockResolvedValue(1);

    await playcountService.incrementPlayCount('game-1', 'user-1');

    expect(mockRedis.incr).toHaveBeenCalledWith('play_count:game-1');
    expect(mockGamePlay.create).toHaveBeenCalledWith({ data: { userId: 'user-1', gameId: 'game-1' } });
  });

  it('throws when game does not exist', async () => {
    mockGame.findUnique.mockResolvedValue(null);

    await expect(
      playcountService.incrementPlayCount('nonexistent', 'user-1')
    ).rejects.toThrow('Game not found or inactive');
  });

  it('throws when game is inactive', async () => {
    mockGame.findUnique.mockResolvedValue(null);

    await expect(
      playcountService.incrementPlayCount('game-1', 'user-1')
    ).rejects.toThrow('Game not found or inactive');
  });
});

describe('PlayCount - flush atomicity', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRedis.set.mockResolvedValue('OK');
    mockRedis.scan.mockResolvedValue(['0', ['play_count:game-1']]);
    mockRedis.get.mockResolvedValue('5');
    mockRedis.decrby.mockResolvedValue(0);
    mockRedis.del.mockResolvedValue(1);
    mockGame.update.mockResolvedValue({} as any);
  });

  it('decrements Redis only after DB transaction succeeds', async () => {
    mockPrisma.$transaction.mockResolvedValue([{}] as any);

    const { flushOnShutdown } = await import('../src/jobs/playcount.flush');
    await flushOnShutdown();

    expect(mockGame.update).toHaveBeenCalledWith({
      where: { id: 'game-1' },
      data: { playCount: { increment: 5 } },
    });
    expect(mockRedis.decrby).toHaveBeenCalledWith('play_count:game-1', 5);
    expect(mockRedis.del).toHaveBeenCalledWith('dashboard:stats');
  });

  it('keeps Redis count untouched when DB transaction fails', async () => {
    mockPrisma.$transaction.mockRejectedValue(new Error('DB error'));

    const { flushOnShutdown } = await import('../src/jobs/playcount.flush');
    await flushOnShutdown();

    expect(mockRedis.decrby).not.toHaveBeenCalledWith('play_count:game-1', 5);
    expect(mockRedis.del).toHaveBeenCalledWith('lock:play_count_flush');
  });
});
