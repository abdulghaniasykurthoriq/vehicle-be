import { z, ZodSchema } from "zod";
import { Request, Response, NextFunction } from "express";

type Parts = "body" | "query" | "params";

export function validate(schemas: Partial<Record<Parts, ZodSchema>>) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      if (schemas.body) req.body = schemas.body.parse(req.body);
      if (schemas.query) req.query = schemas.query.parse(req.query);
      if (schemas.params) req.params = schemas.params.parse(req.params);
      next();
    } catch (err: any) {
      return res.status(400).json({ message: "Validation error", errors: err.errors || err.message });
    }
  };
}
