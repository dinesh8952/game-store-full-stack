import { Request, Response } from 'express';
import { Genre } from '@prisma/client';
import * as adminService from '../services/admin.service';
import * as gameService from '../services/game.service';
import * as dashboardService from '../services/dashboard.service';

export const getDashboard = async (_req: Request, res: Response) => {
  try {
    const stats = await dashboardService.getDashboardStats();
    res.status(200).json(stats);
  } catch {
    res.status(500).json({ error: 'Failed to load dashboard' });
  }
};

export const getPendingUsers = async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const status = req.query.status as string | undefined;
  try {
    const data = await adminService.getPendingUsers(page, limit, status);
    res.status(200).json(data);
  } catch {
    res.status(500).json({ error: 'Failed to load users' });
  }
};

export const approveUser = async (req: Request, res: Response) => {
  try {
    await adminService.approveUser(req.params['id'] as string);
    res.status(200).json({ message: 'User approved' });
  } catch (err: any) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
};

export const rejectUser = async (req: Request, res: Response) => {
  try {
    await adminService.rejectUser(req.params['id'] as string);
    res.status(200).json({ message: 'User rejected' });
  } catch (err: any) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
};

export const getGames = async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  try {
    const data = await gameService.getAllGames(page);
    res.status(200).json(data);
  } catch {
    res.status(500).json({ error: 'Failed to load games' });
  }
};

export const postCreateGame = async (req: Request, res: Response) => {
  const { name, description, genre, thumbnailUrl, maxPlayers, isActive } = req.body;
  try {
    const game = await gameService.createGame({
      name,
      description,
      genre: genre as Genre,
      thumbnailUrl,
      maxPlayers: parseInt(maxPlayers),
      isActive: isActive === 'true' || isActive === true,
    });
    res.status(201).json(game);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};

export const postEditGame = async (req: Request, res: Response) => {
  const id = req.params['id'] as string;
  const { name, description, genre, thumbnailUrl, maxPlayers, isActive } = req.body;
  try {
    const game = await gameService.updateGame(id, {
      name,
      description,
      genre: genre as Genre,
      thumbnailUrl,
      maxPlayers: parseInt(maxPlayers),
      isActive: isActive === 'true' || isActive === true,
    });
    res.status(200).json(game);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};

export const deleteGame = async (req: Request, res: Response) => {
  try {
    await gameService.deleteGame(req.params['id'] as string);
    res.status(200).json({ message: 'Game deactivated' });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};
