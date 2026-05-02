import { Request, Response } from 'express';
import { Genre } from '@prisma/client';
import * as gameService from '../services/game.service';
import * as playcountService from '../services/playcount.service';

export const getGames = async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const rawGenre = req.query.genre as string;
  const genre = Object.values(Genre).includes(rawGenre as Genre) ? rawGenre as Genre : undefined;
  try {
    const data = await gameService.getActiveGames(page, genre);
    res.status(200).json(data);
  } catch {
    res.status(500).json({ error: 'Failed to load games' });
  }
};

export const getGameDetail = async (req: Request, res: Response) => {
  try {
    const game = await gameService.getGameById(req.params['id'] as string);
    if (!game || !game.isActive) return res.status(404).json({ error: 'Game not found' });
    const totalPlayCount = await playcountService.getTotalPlayCount(game.id, game.playCount);
    res.status(200).json({ ...game, totalPlayCount });
  } catch {
    res.status(500).json({ error: 'Failed to load game' });
  }
};

export const playGame = async (req: Request, res: Response) => {
  try {
    await playcountService.incrementPlayCount(req.params['id'] as string, req.user!.id);
    res.status(200).json({ success: true });
  } catch {
    res.status(500).json({ error: 'Failed to record play' });
  }
};
