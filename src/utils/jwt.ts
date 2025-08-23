import jwt from "jsonwebtoken";
import { config } from "../config";

export type AccessTokenPayload = {
  sub: string;
  email: string;
  role: string;
  type: "access";
};
export type RefreshTokenPayload = { sub: string; type: "refresh" };

export function signAccessToken(payload: Omit<AccessTokenPayload, "type">) {
  return jwt.sign({ ...payload, type: "access" }, config.jwt.accessSecret, {
    expiresIn: config.jwt.accessTtl,
  });
}

export function signRefreshToken(payload: Omit<RefreshTokenPayload, "type">) {
  return jwt.sign({ ...payload, type: "refresh" }, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshTtl,
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, config.jwt.accessSecret) as AccessTokenPayload;
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  return jwt.verify(token, config.jwt.refreshSecret) as RefreshTokenPayload;
}
