// src/routes/usersRouter.ts
import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { CreateUserSchema, UpdateUserSchema } from "../schemas";
import bcrypt from "bcryptjs";
import { UserService } from "../services/userService";

/**
 * @openapi
 * tags:
 *   - name: Users
 *     description: User management
 *
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 *
 *   schemas:
 *     User:
 *       type: object
 *       properties:
 *         id: { type: string, example: "usr_01HXYZ..." }
 *         email: { type: string, format: email, example: "user@example.com" }
 *         name: { type: string, nullable: true, example: "User" }
 *         role: { type: string, example: "USER" }
 *         createdAt: { type: string, format: date-time }
 *         updatedAt: { type: string, format: date-time }
 *
 *     UserPublic:
 *       type: object
 *       properties:
 *         id: { type: string }
 *         email: { type: string, format: email }
 *         name: { type: string, nullable: true }
 *         role: { type: string }
 *
 *     CreateUserRequest:
 *       type: object
 *       required: [email, password, role]
 *       properties:
 *         email: { type: string, format: email }
 *         name: { type: string, nullable: true }
 *         password: { type: string, format: password, minLength: 6 }
 *         role:
 *           type: string
 *           description: User role (e.g., USER/ADMIN)
 *           example: USER
 *
 *     UpdateUserRequest:
 *       type: object
 *       properties:
 *         email: { type: string, format: email }
 *         name: { type: string, nullable: true }
 *         password: { type: string, format: password, minLength: 6 }
 *         role:
 *           type: string
 *           example: USER
 *
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         message: { type: string }
 */

export function usersRouter(services: { users: UserService }) {
  const r = Router();

  // Semua endpoint di-bekingi auth (Bearer access token)
  r.use(requireAuth);

  /**
   * @openapi
   * /users:
   *   get:
   *     tags: [Users]
   *     summary: List users
   *     security: [{ bearerAuth: [] }]
   *     responses:
   *       '200':
   *         description: List of users
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items: { $ref: '#/components/schemas/UserPublic' }
   */
  r.get("/", async (_req, res) => {
    const list = await services.users.list();
    res.json(list);
  });

  /**
   * @openapi
   * /users/{id}:
   *   get:
   *     tags: [Users]
   *     summary: Get user by ID
   *     security: [{ bearerAuth: [] }]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string }
   *     responses:
   *       '200':
   *         description: A user
   *         content:
   *           application/json:
   *             schema: { $ref: '#/components/schemas/UserPublic' }
   *       '404':
   *         description: Not found
   *         content:
   *           application/json:
   *             schema: { $ref: '#/components/schemas/ErrorResponse' }
   */
  r.get("/:id", async (req, res) => {
    const u = await services.users.get(req.params.id);
    if (!u) return res.status(404).json({ message: "Not found" });
    res.json(u);
  });

  /**
   * @openapi
   * /users:
   *   post:
   *     tags: [Users]
   *     summary: Create user
   *     security: [{ bearerAuth: [] }]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema: { $ref: '#/components/schemas/CreateUserRequest' }
   *     responses:
   *       '201':
   *         description: Created
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 id: { type: string }
   *                 email: { type: string, format: email }
   *       '400':
   *         description: Validation error
   *         content:
   *           application/json:
   *             schema: { $ref: '#/components/schemas/ErrorResponse' }
   *       '409':
   *         description: Email already exists
   *         content:
   *           application/json:
   *             schema: { $ref: '#/components/schemas/ErrorResponse' }
   */
  r.post("/", validate({ body: CreateUserSchema }), async (req, res, next) => {
    try {
      const { email, name, password, role } = req.body as {
        email: string;
        name?: string | null;
        password: string;
        role: string;
      };
      console.log(req.body);

      const passwordHash = await bcrypt.hash(password, 10);
      const u = await services.users.create({
        email,
        name: name ?? undefined,
        passwordHash,
        role,
      });
      res.status(201).json({ id: u.id, email: u.email });
    } catch (err: any) {
      // sesuaikan dengan error code ORM kamu (misal Prisma P2002)
      if (err?.code === "P2002") {
        return res.status(409).json({ message: "Email already exists" });
      }
      next(err);
    }
  });

  /**
   * @openapi
   * /users/{id}:
   *   patch:
   *     tags: [Users]
   *     summary: Update user
   *     security: [{ bearerAuth: [] }]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string }
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema: { $ref: '#/components/schemas/UpdateUserRequest' }
   *     responses:
   *       '200':
   *         description: Updated user
   *         content:
   *           application/json:
   *             schema: { $ref: '#/components/schemas/UserPublic' }
   *       '404':
   *         description: Not found
   *         content:
   *           application/json:
   *             schema: { $ref: '#/components/schemas/ErrorResponse' }
   */
  r.patch("/:id", validate({ body: UpdateUserSchema }), async (req, res) => {
    const { password, ...rest } = req.body as Record<string, unknown> & {
      password?: string;
    };
    const data: any = { ...rest };
    if (password) {
      data.passwordHash = await bcrypt.hash(password, 10);
    }
    const u = await services.users.update(req.params.id, data);
    if (!u) return res.status(404).json({ message: "Not found" });
    res.json({ id: u.id, email: u.email, name: u.name, role: u.role });
  });

  /**
   * @openapi
   * /users/{id}:
   *   delete:
   *     tags: [Users]
   *     summary: Delete user
   *     security: [{ bearerAuth: [] }]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string }
   *     responses:
   *       '204':
   *         description: No Content
   *       '404':
   *         description: Not found
   *         content:
   *           application/json:
   *             schema: { $ref: '#/components/schemas/ErrorResponse' }
   */
  r.delete("/:id", async (req, res) => {
    const ok = await services.users.delete(req.params.id);
    if (!ok) return res.status(404).json({ message: "Not found" });
    res.status(204).send();
  });

  return r;
}
