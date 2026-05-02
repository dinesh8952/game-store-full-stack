import type { UserStatus } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        isSuperAdmin: boolean;
        status: UserStatus;
        profileComplete: boolean;
      };
    }
  }
}

export {};
