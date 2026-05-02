import { Request, Response } from 'express';
import * as authService from '../services/auth.service';

export const postSignup = async (req: Request, res: Response) => {
  const { email, password } = req.body;
  try {
    await authService.signup(email, password);
    res.status(201).json({ message: 'Signup successful', nextStep: 'complete_profile' });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};

export const postLogin = async (req: Request, res: Response) => {
  const { email, password } = req.body;
  try {
    const { token, user } = await authService.login(email, password);
    res.status(200).json({
      token,
      type: 'Bearer',
      user: {
        id: user.id,
        email: user.email,
        status: user.status,
        profileComplete: user.profileComplete,
        isSuperAdmin: user.isSuperAdmin,
      },
    });
  } catch (err: any) {
    res.status(401).json({ error: err.message });
  }
};

const VALID_COUNTRIES = new Set([
  'IN','US','GB','AU','CA','SG','AE','DE','FR','JP','NZ','NL','SE','NO','DK','FI','CH','BR','ZA','NG',
]);

export const postProfile = async (req: Request, res: Response) => {
  const { firstName, lastName, phone, address, city, state, country } = req.body;

  if (!VALID_COUNTRIES.has(country)) {
    return res.status(400).json({ error: 'Invalid country code' });
  }

  if (!/^\d{7,15}$/.test(phone)) {
    return res.status(400).json({ error: 'Phone must be 7–15 digits' });
  }

  try {
    await authService.completeProfile(req.user!.id, {
      firstName, lastName, phone, address, city, state, country,
    });
    res.status(200).json({ message: 'Profile completed', nextStep: 'await_approval' });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};

export const getMe = async (req: Request, res: Response) => {
  // req.user is already populated with fresh DB data by the authenticate middleware
  res.status(200).json(req.user);
};
