// src/routes/authRouter.ts
import { Router } from "express";
import { validate } from "../middleware/validate";
import { LoginSchema, RegisterSchema } from "../schemas";
import { AuthService } from "../services/authService";

/**
 * @openapi
 * tags:
 *   - name: Auth
 *     description: Authentication endpoints
 *
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           example: "usr_01HXYZ..."
 *         email:
 *           type: string
 *           format: email
 *           example: "user@example.com"
 *         role:
 *           type: string
 *           example: "USER"
 *         name:
 *           type: string
 *           nullable: true
 *           example: "Budi"
 *
 *     AuthRegisterRequest:
 *       type: object
 *       required: [email, password]
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *         name:
 *           type: string
 *           nullable: true
 *         password:
 *           type: string
 *           format: password
 *
 *     RegisterResponse:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         email:
 *           type: string
 *           format: email
 *         name:
 *           type: string
 *           nullable: true
 *
 *     AuthLoginRequest:
 *       type: object
 *       required: [email, password]
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *         password:
 *           type: string
 *           format: password
 *
 *     AuthLoginResponse:
 *       type: object
 *       properties:
 *         user:
 *           $ref: '#/components/schemas/User'
 *         accessToken:
 *           type: string
 *           description: JWT access token (masa berlaku singkat)
 *
 *     AuthRefreshResponse:
 *       type: object
 *       properties:
 *         accessToken:
 *           type: string
 *
 *     OkResponse:
 *       type: object
 *       properties:
 *         ok:
 *           type: boolean
 *           example: true
 *
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 */

export function authRouter(services: { auth: AuthService }) {
  const r = Router();

  const isProd = process.env.NODE_ENV === "production";

  const cookieBase = {
    httpOnly: true,
    path: "/", // penting: konsisten untuk set & clear
    secure: true, // false di localhost (http)
    sameSite: "none", // none+secure hanya di prod/https
  } as const;

  /**
   * @openapi
   * /auth/register:
   *   post:
   *     tags: [Auth]
   *     summary: Register user baru
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/AuthRegisterRequest'
   *     responses:
   *       '201':
   *         description: Berhasil membuat user
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/RegisterResponse'
   *       '409':
   *         description: Email sudah terdaftar
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   */
  r.post(
    "/register",
    validate({ body: RegisterSchema }),
    async (req, res, next) => {
      const { email, name, password } = req.body;
      try {
        const u = await services.auth.register(email, name ?? null, password);
        res.status(201).json({ id: u.id, email: u.email, name: u.name });
      } catch (err: any) {
        if (err?.code === "P2002") {
          return res.status(409).json({ message: "Email already registered" });
        }
        next(err);
      }
    }
  );

  /**
   * @openapi
   * /auth/login:
   *   post:
   *     tags: [Auth]
   *     summary: Login dan set refreshToken sebagai HttpOnly cookie
   *     description: |
   *       - Mengembalikan `accessToken` dalam body.
   *       - Mengirim cookie `refreshToken` (HttpOnly) dengan masa berlaku 7 hari.
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/AuthLoginRequest'
   *     responses:
   *       '200':
   *         description: Login sukses
   *         headers:
   *           Set-Cookie:
   *             schema:
   *               type: string
   *             description: HttpOnly cookie `refreshToken`
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/AuthLoginResponse'
   *       '401':
   *         description: Kredensial tidak valid
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   */
  r.post("/login", validate({ body: LoginSchema }), async (req, res) => {
    const { email, password } = req.body;
    try {
      const { user, accessToken, refreshToken } = await services.auth.login(
        email,
        password
      );

      // (Opsional) simpan accessToken via JSON response, bukan cookie
      // supaya frontend bisa simpan di memory
      res.cookie("refreshToken", refreshToken, {
        ...cookieBase,
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      return res.json({
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          name: user.name ?? null,
        },
        accessToken, // <-- kirim ke client
      });
    } catch {
      res.status(401).json({ message: "Invalid credentials" });
    }
  });

  /**
   * @openapi
   * /auth/refresh:
   *   post:
   *     tags: [Auth]
   *     summary: Tukar refreshToken (cookie) menjadi accessToken baru
   *     description: Mengambil `refreshToken` dari HttpOnly cookie dan mengembalikan `accessToken` baru.
   *     responses:
   *       '200':
   *         description: Access token baru berhasil dibuat
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/AuthRefreshResponse'
   *       '401':
   *         description: Refresh token tidak ada/invalid/expired
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   */
  r.post("/refresh", async (req, res) => {
    const rt = req.cookies?.refreshToken as string | undefined; // pastikan cookie-parser aktif
    if (!rt) return res.status(401).json({ message: "No refresh token" });

    try {
      const { accessToken /*, refreshToken: newRt*/ } =
        await services.auth.refresh(rt);

      // Dev: jangan rotasi refresh token dulu untuk menghindari 401 akibat double-call
      // Kalau mau rotasi:
      // res.cookie("refreshToken", newRt, { ...cookieBase, maxAge: 7 * 24 * 60 * 60 * 1000 });

      // Kirim accessToken ke client
      return res.json({ accessToken });
    } catch {
      return res.status(401).json({ message: "Invalid refresh" });
    }
  });

  /**
   * @openapi
   * /auth/logout:
   *   post:
   *     tags: [Auth]
   *     summary: Logout dan hapus cookie refreshToken
   *     responses:
   *       '200':
   *         description: Logout sukses
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/OkResponse'
   */
  r.post("/logout", async (req, res) => {
    const rt = req.cookies?.refreshToken as string | undefined;
    if (rt) await services.auth.logout(rt).catch(() => {});
    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      path: "/",
    });
    // kalau dulu kamu set accessToken di cookie, clear juga:
    res.clearCookie("accessToken", {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      path: "/",
    });
    return res.json({ ok: true });
  });

  return r;
}
