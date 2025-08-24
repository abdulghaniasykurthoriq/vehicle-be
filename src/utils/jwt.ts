import jwt, { SignOptions } from "jsonwebtoken";
import { config } from "../config";

export type AccessTokenPayload = {
  sub: string;
  email: string;
  role: string;
  type: "access";
};
export type RefreshTokenPayload = { sub: string; type: "refresh" };

const accessSecret = config.jwt.accessSecret as string;
const refreshSecret = config.jwt.refreshSecret as string;

// pastikan TTL sesuai tipe
const accessTtl = config.jwt.accessTtl as SignOptions["expiresIn"];
const refreshTtl = config.jwt.refreshTtl as SignOptions["expiresIn"];

export function signAccessToken(payload: Omit<AccessTokenPayload, "type">) {
  return jwt.sign({ ...payload, type: "access" }, accessSecret, {
    expiresIn: accessTtl,
  });
}

export function signRefreshToken(payload: Omit<RefreshTokenPayload, "type">) {
  return jwt.sign({ ...payload, type: "refresh" }, refreshSecret, {
    expiresIn: refreshTtl,
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, accessSecret) as AccessTokenPayload;
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  return jwt.verify(token, refreshSecret) as RefreshTokenPayload;
}
