process.env.JWT_SECRET = 'test_secret_for_jest_32chars_padded';

import request from 'supertest';
import app from '../src/app';
import jwt from 'jsonwebtoken';
import prisma from '../src/config/db';
import * as adminService from '../src/services/admin.service';

jest.mock('../src/config/db', () => ({
  __esModule: true,
  default: {
    user: { findUnique: jest.fn(), update: jest.fn(), count: jest.fn(), findMany: jest.fn() },
    game: { count: jest.fn(), findMany: jest.fn() },
    $queryRaw: jest.fn(),
    $connect: jest.fn(),
    $disconnect: jest.fn(),
  },
}));

jest.mock('../src/config/redis', () => ({
  __esModule: true,
  default: {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    setex: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
    scan: jest.fn().mockResolvedValue(['0', []]),
    mget: jest.fn().mockResolvedValue([]),
    ping: jest.fn().mockResolvedValue('PONG'),
    exists: jest.fn().mockResolvedValue(0),
    disconnect: jest.fn(),
  },
}));

jest.mock('../src/services/admin.service', () => ({
  approveUser: jest.fn().mockResolvedValue({}),
  rejectUser: jest.fn().mockResolvedValue({}),
  getPendingUsers: jest.fn().mockResolvedValue({
    users: [],
    total: 0,
    pages: 0,
    page: 1,
    limit: 10,
  }),
}));

const mockUser = prisma.user as jest.Mocked<typeof prisma.user>;
const mockAdminService = adminService as jest.Mocked<typeof adminService>;

const adminUser = {
  id: 'admin-1',
  email: 'admin@test.com',
  passwordHash: 'hash',
  isSuperAdmin: true,
  status: 'APPROVED' as const,
  profileComplete: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

function makeToken(id: string = 'admin-1') {
  return jwt.sign({ id, email: `${id}@test.com`, jti: `jti-${id}` }, process.env.JWT_SECRET!, { expiresIn: '1h' });
}

describe('Admin API - Users', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUser.findUnique.mockResolvedValue(adminUser);
  });

  it('returns users for an authenticated admin', async () => {
    const res = await request(app)
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${makeToken()}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ users: [], total: 0, pages: 0, page: 1, limit: 10 });
    expect(mockAdminService.getPendingUsers).toHaveBeenCalledWith(1, 10, undefined);
  });

  it('approves a user and returns JSON', async () => {
    const res = await request(app)
      .post('/api/admin/users/user-1/approve')
      .set('Authorization', `Bearer ${makeToken()}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ message: 'User approved' });
    expect(mockAdminService.approveUser).toHaveBeenCalledWith('user-1');
  });

  it('rejects unauthenticated access with 401', async () => {
    const res = await request(app).post('/api/admin/users/user-1/approve');

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Unauthorized');
  });

  it('blocks non-admin users with 403', async () => {
    mockUser.findUnique.mockResolvedValue({
      ...adminUser,
      id: 'user-1',
      email: 'user@test.com',
      isSuperAdmin: false,
    });

    const res = await request(app)
      .post('/api/admin/users/user-1/approve')
      .set('Authorization', `Bearer ${makeToken('user-1')}`);

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('Admin access required');
  });
});
