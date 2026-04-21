import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema } from 'zod';
import { ValidationError } from '../shared/errors';

export function validate(schema: ZodSchema, source: 'body' | 'query' | 'params' = 'body') {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      const data = schema.parse(req[source]);
      (req as any)[source] = data;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const messages = error.issues.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', ');
        next(new ValidationError(messages));
      } else {
        next(error);
      }
    }
  };
}
