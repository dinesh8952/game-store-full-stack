import { Router } from 'express';
import * as authController from '../controllers/auth.controller';
import { authenticate } from '../middleware/authenticate';
import { authLimiter, signupLimiter } from '../middleware/rateLimiter';
import { signupRules, loginRules, profileRules, handleValidation } from '../middleware/validate';

const router = Router();

router.post('/signup', signupLimiter, signupRules, handleValidation(), authController.postSignup);
router.post('/login', authLimiter, loginRules, handleValidation(), authController.postLogin);
router.post('/profile', authenticate, profileRules, handleValidation(), authController.postProfile);
router.get('/me', authenticate, authController.getMe);

export default router;
