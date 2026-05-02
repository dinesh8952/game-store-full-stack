import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import crypto from 'crypto';
import prisma from '../config/db';

export async function signup(email: string, password: string) {
  const passwordHash = await bcrypt.hash(password, 12);
  try {
    return await prisma.user.create({ data: { email, passwordHash } });
  } catch (err: any) {
    // P2002 = unique constraint violation — catches race condition the findUnique check misses
    if (err?.code === 'P2002') throw new Error('Email already registered');
    throw err;
  }
}

export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new Error('Invalid email or password');

  const valid = await bcrypt.compare(password, user.passwordHash);
  // Generic error for both cases — prevents user enumeration attacks
  if (!valid) throw new Error('Invalid email or password');

  const jti = crypto.randomUUID();
  const options: SignOptions = { expiresIn: (process.env.JWT_EXPIRES_IN || '15m') as SignOptions['expiresIn'] };
  const token = jwt.sign({ id: user.id, email: user.email, jti }, process.env.JWT_SECRET!, options);

  return { token, user };
}

export async function completeProfile(
  userId: string,
  data: {
    firstName: string;
    lastName: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    country: string;
  }
) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error('User not found');
  if (user.status !== 'PENDING') throw new Error('Profile can only be updated while account is pending approval');

  await prisma.userProfile.upsert({
    where: { userId },
    create: { userId, ...data },
    update: data,
  });

  await prisma.user.update({
    where: { id: userId },
    data: { profileComplete: true },
  });
}
