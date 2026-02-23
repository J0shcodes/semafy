export type ErrorCode =
  | 'INVALID_ADDRESS'
  | 'UNSUPPORTED_CHAIN'
  | 'EOA_ADDRESS'
  | 'CONTRACT_NOT_VERIFIED'
  | 'UPSTREAM_FAILURE';

export interface ApiError {
  error: string;
  code: ErrorCode;
}

export class AppError extends Error {
  constructor(
    public message: string,
    public code: ErrorCode,
    public statusCode: number,
  ) {
    super(message);
  }
}