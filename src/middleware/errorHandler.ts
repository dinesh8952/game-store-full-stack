import { Request, Response, NextFunction } from 'express';
import logger from '../config/logger';

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction) {
  const requestId = req.headers['x-request-id'];
  logger.error({ err, requestId }, 'Unhandled error');
  res.status(500).json({ error: 'Something went wrong' });
}
