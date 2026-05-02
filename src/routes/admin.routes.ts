import { Router } from 'express';
import * as adminController from '../controllers/admin.controller';
import { authenticate } from '../middleware/authenticate';
import { requireAdmin } from '../middleware/requireAdmin';
import { gameRules, handleValidation } from '../middleware/validate';
import { Genre } from '@prisma/client';

const router = Router();

router.use(authenticate, requireAdmin);

router.get('/dashboard', adminController.getDashboard);

router.get('/users', adminController.getPendingUsers);
router.post('/users/:id/approve', adminController.approveUser);
router.post('/users/:id/reject', adminController.rejectUser);

router.get('/games', adminController.getGames);
router.post('/games', gameRules, handleValidation(), adminController.postCreateGame);
router.put('/games/:id', gameRules, handleValidation(), adminController.postEditGame);
router.delete('/games/:id', adminController.deleteGame);

export default router;
