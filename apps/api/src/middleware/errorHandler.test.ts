import { describe, it, expect, vi } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { errorHandler } from './errorHandler';
import { AppError } from 'src/types/errors';

function makeMocks() {
  const req = {} as Request;
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;
  const next = vi.fn() as NextFunction;
  return { req, res, next };
}

describe('errorHandler - AppError', () => {
  it('uses the status code from AppError', () => {
    const { req, res, next } = makeMocks();
    const err = new AppError('Invalid EVM address', 'INVALID_ADDRESS', 400);

    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns the error message and error code in the response body', () => {
    const { req, res, next } = makeMocks();
    const err = new AppError('Invalid EVM address', 'INVALID_ADDRESS', 400);

    errorHandler(err, req, res, next);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'Invalid EVM address' }),
    );
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'INVALID_ADDRESS' }),
    );
  });

  it("handles 503 UPSTREAM_FAILURE correctly", () => {
    const {req, res, next} = makeMocks()
    const err = new AppError("RPC unavailable", "UPSTREAM_FAILURE", 503)

    errorHandler(err, req, res, next)

    expect(res.status).toHaveBeenCalledWith(503)
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({code: "UPSTREAM_FAILURE"}))
  })

  it('handles 422 CONTRACT_NOT_VERIFIED correctly', () => {
    const { req, res, next } = makeMocks();
    const err = new AppError(
      'Contract not verified',
      'CONTRACT_NOT_VERIFIED',
      422,
    );
 
    errorHandler(err, req, res, next);
 
    expect(res.status).toHaveBeenCalledWith(422);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'CONTRACT_NOT_VERIFIED' }),
    );
  });

  it('handles EOA_ADDRESS 400 correctly', () => {
    const { req, res, next } = makeMocks();
    const err = new AppError(
      'This address is a wallet, not a contract.',
      'EOA_ADDRESS',
      400,
    );
 
    errorHandler(err, req, res, next);
 
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'EOA_ADDRESS' }),
    );
  });

});

// ─────────────────────────────────────────────
// Generic / unexpected errors
// ─────────────────────────────────────────────
 
describe('errorHandler — unexpected errors', () => {
  it('returns 500 for a plain Error that is not an AppError', () => {
    const { req, res, next } = makeMocks();
    const err = new Error('Something went wrong unexpectedly');
 
    // Suppress console.error output during this test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    errorHandler(err, req, res, next);
    consoleSpy.mockRestore();
 
    expect(res.status).toHaveBeenCalledWith(500);
  });
 
  it('returns UPSTREAM_FAILURE code for unexpected errors', () => {
    const { req, res, next } = makeMocks();
    const err = new Error('Unexpected crash');
 
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    errorHandler(err, req, res, next);
    consoleSpy.mockRestore();
 
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'UPSTREAM_FAILURE' }),
    );
  });
 
  it('logs unexpected errors to console.error', () => {
    const { req, res, next } = makeMocks();
    const err = new Error('Unexpected crash');
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
 
    errorHandler(err, req, res, next);
 
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
 
  it('does NOT log AppErrors to console.error', () => {
    const { req, res, next } = makeMocks();
    const err = new AppError('Bad input', 'INVALID_ADDRESS', 400);
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
 
    errorHandler(err, req, res, next);
 
    expect(consoleSpy).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});

// ─────────────────────────────────────────────
// AppError class itself
// ─────────────────────────────────────────────

describe('AppError class', () => {
  it('extends the native Error class', () => {
    const err = new AppError('test', 'INVALID_ADDRESS', 400);
    expect(err).toBeInstanceOf(Error);
  });
 
  it('stores message, code, and statusCode correctly', () => {
    const err = new AppError('my message', 'UNSUPPORTED_CHAIN', 400);
    expect(err.message).toBe('my message');
    expect(err.code).toBe('UNSUPPORTED_CHAIN');
    expect(err.statusCode).toBe(400);
  });
});
