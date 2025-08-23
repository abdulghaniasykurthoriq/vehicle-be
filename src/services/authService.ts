import { DB } from "../db";
import bcrypt from "bcryptjs";
import dayjs from "dayjs";
import { signAccessToken, signRefreshToken } from "../utils/jwt";

export class AuthService {
  constructor(private db: DB) {}

  async register(email: string, name: string | null, password: string) {
    const passwordHash = await bcrypt.hash(password, 10);
    return this.db.user.create({
      data: { email, name: name || undefined, passwordHash },
    });
  }

  async login(email: string, password: string) {
    const user = await this.db.user.findUnique({ where: { email } });
    if (!user) throw new Error("Invalid credentials");
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new Error("Invalid credentials");
    const accessToken = signAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role,
    });
    const refreshToken = signRefreshToken({ sub: user.id });
    await this.db.refreshToken.create({
      data: {
        userId: user.id,
        token: refreshToken,
        expiresAt: dayjs().add(7, "day").toDate(),
      },
    });
    return { user, accessToken, refreshToken };
  }

  async refresh(token: string) {
    const row = await this.db.refreshToken.findUnique({ where: { token } });
    if (!row || row.revokedAt || dayjs(row.expiresAt).isBefore(dayjs())) {
      throw new Error("Invalid refresh");
    }
    const user = await this.db.user.findUniqueOrThrow({
      where: { id: row.userId },
    });
    const accessToken = signAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role,
    });
    return { accessToken };
  }

  async logout(token: string) {
    await this.db.refreshToken.update({
      where: { token },
      data: { revokedAt: new Date() },
    });
  }
}
