import { Router } from 'express';
import * as gameController from '../controllers/game.controller';
import { authenticate } from '../middleware/authenticate';
import { requireApproved } from '../middleware/requireApproved';
import { playLimiter } from '../middleware/rateLimiter';

const router = Router();

router.use(authenticate, requireApproved);

router.get('/', gameController.getGames);
router.get('/:id', gameController.getGameDetail);
router.post('/:id/play', playLimiter, gameController.playGame);

export default router;
