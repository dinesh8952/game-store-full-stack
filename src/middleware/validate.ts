import { body, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';

export const signupRules = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/).withMessage('Password must contain an uppercase letter')
    .matches(/[0-9]/).withMessage('Password must contain a number'),
];

export const loginRules = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').notEmpty().withMessage('Password required'),
];

export const profileRules = [
  body('firstName').trim().notEmpty().withMessage('First name required'),
  body('lastName').trim().notEmpty().withMessage('Last name required'),
  body('phone').trim().notEmpty().withMessage('Phone required'),
  body('address').trim().notEmpty().withMessage('Address required'),
  body('city').trim().notEmpty().withMessage('City required'),
  body('state').trim().notEmpty().withMessage('State required'),
  body('country').trim().notEmpty().withMessage('Country required'),
];

export const gameRules = [
  body('name').trim().notEmpty().withMessage('Game name required'),
  body('description').trim().notEmpty().withMessage('Description required'),
  body('genre').notEmpty().withMessage('Genre required'),
  body('thumbnailUrl').isURL().withMessage('Valid thumbnail URL required'),
  body('maxPlayers').isInt({ min: 1, max: 1000 }).withMessage('Max players must be between 1 and 1000'),
];

export function handleValidation() {
  return (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg });
    }
    next();
  };
}
