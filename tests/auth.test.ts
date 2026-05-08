process.env.JWT_SECRET = 'test_secret_for_jest_32chars_padded';

import request from 'supertest';
import app from '../src/app';
import prisma from '../src/config/db';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

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

const mockUser = prisma.user as jest.Mocked<typeof prisma.user>;
const mockProfile = prisma.userProfile as jest.Mocked<typeof prisma.userProfile>;

const baseUser = {
  id: 'user-1',
  email: 'test@example.com',
  passwordHash: 'hashed',
  isSuperAdmin: false,
  status: 'PENDING' as const,
  profileComplete: false,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('Auth API - Signup', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns JSON after successful signup', async () => {
    mockUser.create.mockResolvedValue(baseUser);

    const res = await request(app)
      .post('/api/auth/signup')
      .send({ email: 'test@example.com', password: 'Password1' });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ message: 'Signup successful', nextStep: 'complete_profile' });
    expect(mockUser.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ email: 'test@example.com' }),
    });
  });

  it('rejects signup with invalid email', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send({ email: 'not-an-email', password: 'Password1' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Valid email required');
  });

  it('rejects signup with short password', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send({ email: 'test@example.com', password: '123' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Password must be at least 8 characters');
  });
});

describe('Auth API - Login', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns a bearer token and user JSON after valid login', async () => {
    const passwordHash = await bcrypt.hash('Password1', 10);
    mockUser.findUnique.mockResolvedValue({
      ...baseUser,
      passwordHash,
      status: 'APPROVED',
      profileComplete: true,
    });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'Password1' });

    expect(res.status).toBe(200);
    expect(res.body.type).toBe('Bearer');
    expect(res.body.token).toEqual(expect.any(String));
    expect(res.body.user).toMatchObject({
      id: 'user-1',
      email: 'test@example.com',
      status: 'APPROVED',
      profileComplete: true,
      isSuperAdmin: false,
    });
  });

  it('rejects login with wrong password', async () => {
    const passwordHash = await bcrypt.hash('correctpassword', 10);
    mockUser.findUnique.mockResolvedValue({
      ...baseUser,
      passwordHash,
      status: 'APPROVED',
      profileComplete: true,
    });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'wrongpassword' });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid email or password');
  });
});

describe('Auth API - Profile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('completes a pending user profile', async () => {
    mockUser.findUnique.mockResolvedValue(baseUser);
    mockProfile.upsert.mockResolvedValue({} as any);
    mockUser.update.mockResolvedValue({ ...baseUser, profileComplete: true });

    const token = jwt.sign({ id: 'user-1', email: 'test@example.com', jti: 'jti-user-1' }, process.env.JWT_SECRET!, {
      expiresIn: '1h',
    });

    const res = await request(app)
      .post('/api/auth/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({
        firstName: 'Test',
        lastName: 'User',
        phone: '9876543210',
        address: 'Main Road',
        city: 'Hyderabad',
        state: 'TG',
        country: 'IN',
      });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ message: 'Profile completed', nextStep: 'await_approval' });
  });
});
