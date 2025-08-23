import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../utils/jwt";

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization;
    const cookieToken = (req as any).cookies?.accessToken as string | undefined;
    const token = header?.startsWith("Bearer ") ? header.slice(7) : cookieToken;
    if (!token) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const payload = verifyAccessToken(token);
    (req as any).user = payload;
    next();
  } catch (e) {
    return res.status(401).json({ message: "Invalid token" });
  }
}
