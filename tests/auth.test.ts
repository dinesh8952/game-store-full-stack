import request from 'supertest';
import app from '../src/app';

jest.mock('../src/config/db', () => ({
  __esModule: true,
  default: {
    user: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
    userProfile: { upsert: jest.fn() },
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

import prisma from '../src/config/db';
import bcrypt from 'bcryptjs';

const mockUser = prisma.user as jest.Mocked<typeof prisma.user>;

// Helper: GET a form page to extract a valid CSRF token cookie
async function getCsrfToken(path: string): Promise<{ token: string; cookie: string }> {
  const res = await request(app).get(path);
  const cookieHeader = res.headers['set-cookie'] as string[] | string;
  const cookies = Array.isArray(cookieHeader) ? cookieHeader : [cookieHeader || ''];
  const csrfCookie = cookies.find((c: string) => c.startsWith('csrf_token=')) || '';
  const token = csrfCookie.split(';')[0].replace('csrf_token=', '');
  return { token, cookie: csrfCookie.split(';')[0] };
}

describe('Auth — Signup', () => {
  it('returns 302 redirect after successful signup', async () => {
    mockUser.findUnique.mockResolvedValue(null);
    mockUser.create.mockResolvedValue({
      id: 'user-1', email: 'test@example.com', passwordHash: 'hashed',
      isSuperAdmin: false, isApproved: false, isRejected: false,
      profileComplete: false, createdAt: new Date(), updatedAt: new Date(),
    });

    const { token, cookie } = await getCsrfToken('/auth/signup');
    const res = await request(app)
      .post('/auth/signup')
      .set('Cookie', cookie)
      .send({ email: 'test@example.com', password: 'Password1', _csrf: token });

    expect(res.status).toBe(302);
    expect(res.headers.location).toContain('/auth/login');
  });

  it('rejects signup with invalid email', async () => {
    const { token, cookie } = await getCsrfToken('/auth/signup');
    const res = await request(app)
      .post('/auth/signup')
      .set('Cookie', cookie)
      .send({ email: 'not-an-email', password: 'Password1', _csrf: token });

    expect(res.status).toBe(400);
  });

  it('rejects signup with short password', async () => {
    const { token, cookie } = await getCsrfToken('/auth/signup');
    const res = await request(app)
      .post('/auth/signup')
      .set('Cookie', cookie)
      .send({ email: 'test@example.com', password: '123', _csrf: token });

    expect(res.status).toBe(400);
  });
});

describe('Auth — Login', () => {
  it('sets JWT cookie and redirects after valid login', async () => {
    const passwordHash = await bcrypt.hash('Password1', 10);
    mockUser.findUnique.mockResolvedValue({
      id: 'user-1', email: 'test@example.com', passwordHash,
      isSuperAdmin: false, isApproved: true, isRejected: false,
      profileComplete: true, createdAt: new Date(), updatedAt: new Date(),
    });

    const { token, cookie } = await getCsrfToken('/auth/login');
    const res = await request(app)
      .post('/auth/login')
      .set('Cookie', cookie)
      .send({ email: 'test@example.com', password: 'Password1', _csrf: token });

    expect(res.status).toBe(302);
    const setCookie = (res.headers['set-cookie'] as unknown) as string[];
    expect(setCookie.some((c: string) => c.startsWith('token='))).toBe(true);
  });

  it('rejects login with wrong password', async () => {
    const passwordHash = await bcrypt.hash('correctpassword', 10);
    mockUser.findUnique.mockResolvedValue({
      id: 'user-1', email: 'test@example.com', passwordHash,
      isSuperAdmin: false, isApproved: true, isRejected: false,
      profileComplete: true, createdAt: new Date(), updatedAt: new Date(),
    });

    const { token, cookie } = await getCsrfToken('/auth/login');
    const res = await request(app)
      .post('/auth/login')
      .set('Cookie', cookie)
      .send({ email: 'test@example.com', password: 'wrongpassword', _csrf: token });

    expect(res.status).toBe(200);
    expect(res.text).toContain('Invalid email or password');
  });

  it('redirects unapproved user to pending screen', async () => {
    const passwordHash = await bcrypt.hash('Password1', 10);
    mockUser.findUnique.mockResolvedValue({
      id: 'user-1', email: 'test@example.com', passwordHash,
      isSuperAdmin: false, isApproved: false, isRejected: false,
      profileComplete: true, createdAt: new Date(), updatedAt: new Date(),
    });

    const { token, cookie } = await getCsrfToken('/auth/login');
    const res = await request(app)
      .post('/auth/login')
      .set('Cookie', cookie)
      .send({ email: 'test@example.com', password: 'Password1', _csrf: token });

    expect(res.status).toBe(302);
    expect(res.headers.location).toContain('/auth/pending');
  });
});
