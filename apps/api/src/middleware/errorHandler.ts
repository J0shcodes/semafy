import { Request, Response, NextFunction } from 'express';
import { AppError } from '../types/errors';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (err instanceof AppError) {
    return res
      .status(err.statusCode)
      .json({ error: err.message, code: err.code });
  }

  console.error(err);
  return res
    .status(500)
    .json({ error: 'An unexpected error occurred', code: 'UPSTREAM_FAILURE' });
}
