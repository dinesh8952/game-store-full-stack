import request from 'supertest';
import app from '../src/app';
import jwt from 'jsonwebtoken';

jest.mock('../src/config/db', () => ({
  __esModule: true,
  default: {
    user: { findUnique: jest.fn(), update: jest.fn() },
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
    del: jest.fn().mockResolvedValue(1),
    ping: jest.fn().mockResolvedValue('PONG'),
    exists: jest.fn().mockResolvedValue(0),
    disconnect: jest.fn(),
  },
}));

jest.mock('../src/services/admin.service', () => ({
  approveUser: jest.fn().mockResolvedValue({}),
  rejectUser: jest.fn().mockResolvedValue({}),
  getPendingUsers: jest.fn().mockResolvedValue([]),
}));

import prisma from '../src/config/db';

const mockUser = prisma.user as jest.Mocked<typeof prisma.user>;

process.env.JWT_SECRET = 'test_secret_for_jest_32chars_padded';

function makeAdminCookie(isAdmin: boolean = true) {
  const id = isAdmin ? 'admin-1' : 'user-1';
  const token = jwt.sign(
    { id, email: `${isAdmin ? 'admin' : 'user'}@test.com`, jti: `jti-${id}` },
    process.env.JWT_SECRET!,
    { expiresIn: '1h' }
  );
  return `token=${token}`;
}

// Get a CSRF token from a page to use in form posts
async function getCsrfToken(): Promise<{ token: string; csrfCookie: string }> {
  const res = await request(app)
    .get('/admin/users')
    .set('Cookie', makeAdminCookie());
  const cookieHeader = res.headers['set-cookie'] as string[] | string;
  const cookies = Array.isArray(cookieHeader) ? cookieHeader : [cookieHeader || ''];
  const csrfCookie = cookies.find((c: string) => c.startsWith('csrf_token=')) || '';
  const token = csrfCookie.split(';')[0].replace('csrf_token=', '');
  return { token, csrfCookie: csrfCookie.split(';')[0] };
}

describe('Admin — Approve / Reject User', () => {
  beforeEach(() => {
    mockUser.findUnique.mockResolvedValue({
      id: 'admin-1', email: 'admin@test.com',
      isSuperAdmin: true, isApproved: true,
      isRejected: false, profileComplete: true,
      passwordHash: 'hash', createdAt: new Date(), updatedAt: new Date(),
    });
  });

  it('approves a user and redirects', async () => {
    const { token, csrfCookie } = await getCsrfToken();
    const adminCookie = makeAdminCookie();

    const res = await request(app)
      .post('/admin/users/user-1/approve')
      .set('Cookie', [adminCookie, csrfCookie].join('; '))
      .send({ _csrf: token });

    expect(res.status).toBe(302);
    expect(res.headers.location).toContain('/admin/users');
  });

  it('rejects unauthenticated access with redirect to login', async () => {
    const res = await request(app)
      .post('/admin/users/user-1/approve');

    expect(res.status).toBe(302);
    expect(res.headers.location).toContain('/auth/login');
  });

  it('blocks non-admin users with redirect', async () => {
    mockUser.findUnique.mockResolvedValue({
      id: 'user-1', email: 'user@test.com',
      isSuperAdmin: false, isApproved: true,
      isRejected: false, profileComplete: true,
      passwordHash: 'hash', createdAt: new Date(), updatedAt: new Date(),
    });

    const res = await request(app)
      .post('/admin/users/user-1/approve')
      .set('Cookie', makeAdminCookie(false));

    // requireAdmin returns 403 for non-admin users
    expect([302, 403]).toContain(res.status);
  });
});
