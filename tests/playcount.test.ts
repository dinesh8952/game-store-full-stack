jest.mock('../src/config/db', () => ({
  __esModule: true,
  default: {
    game: { findUnique: jest.fn(), update: jest.fn() },
    gamePlay: { create: jest.fn() },
  },
}));

jest.mock('../src/config/redis', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    set: jest.fn(),
    incr: jest.fn(),
    getset: jest.fn(),
    incrby: jest.fn(),
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
const mockRedis = redis as jest.Mocked<typeof redis>;

describe('PlayCount — incrementPlayCount', () => {
  it('increments Redis counter when game is active', async () => {
    mockGame.findUnique.mockResolvedValue({ id: 'game-1', isActive: true } as any);
    mockGamePlay.create.mockResolvedValue({} as any);
    mockRedis.incr.mockResolvedValue(1);

    await playcountService.incrementPlayCount('game-1', 'user-1');

    expect(mockRedis.incr).toHaveBeenCalledWith('play_count:game-1');
  });

  it('throws when game does not exist', async () => {
    mockGame.findUnique.mockResolvedValue(null);

    await expect(
      playcountService.incrementPlayCount('nonexistent', 'user-1')
    ).rejects.toThrow('Game not found or inactive');
  });

  it('throws when game is inactive', async () => {
    mockGame.findUnique.mockResolvedValue(null); // isActive: false filtered out by Prisma where clause

    await expect(
      playcountService.incrementPlayCount('game-1', 'user-1')
    ).rejects.toThrow('Game not found or inactive');
  });
});

describe('PlayCount — flush atomicity', () => {
  it('restores Redis count when DB update fails', async () => {
    // GETSET atomically captures count and resets to 0
    mockRedis.set.mockResolvedValue('OK'); // lock acquired (SET NX returns 'OK' on success)
    mockRedis.scan
      .mockResolvedValueOnce(['0', ['play_count:game-1']])
      .mockResolvedValueOnce(['0', []]); // second scan call returns empty (for shutdown scan)
    mockRedis.getset.mockResolvedValue('5');
    mockGame.update.mockRejectedValue(new Error('DB error'));
    mockRedis.incrby.mockResolvedValue(5);
    mockRedis.del.mockResolvedValue(1);

    const { flushOnShutdown } = await import('../src/jobs/playcount.flush');
    await flushOnShutdown();

    // Count must be restored after DB failure — no data loss
    expect(mockRedis.incrby).toHaveBeenCalledWith('play_count:game-1', 5);
  });
});
