export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(`${resource} tidak ditemukan`, 404);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Akses tidak diizinkan') {
    super(message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Tidak memiliki akses') {
    super(message, 403);
  }
}

export class ValidationError extends AppError {
  constructor(message: string = 'Data tidak valid') {
    super(message, 422);
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Data sudah ada') {
    super(message, 409);
  }
}

export class BadRequestError extends AppError {
  constructor(message: string = 'Permintaan tidak valid') {
    super(message, 400);
  }
}
