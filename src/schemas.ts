import { z } from "zod";

export const RegisterSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).optional(),
  password: z.string().min(6)
});

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

export const CreateUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).optional(),
  passwordHash: z.string().min(10),
  role: z.string().optional()
});

export const UpdateUserSchema = z.object({
  email: z.string().email().optional(),
  name: z.string().min(1).optional(),
  role: z.string().optional()
});

export const VehicleStatusQuery = z.object({
  date: z.string().date().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD required"))
});

export const ReportQuery = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
});
