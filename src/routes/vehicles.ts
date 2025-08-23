// src/routes/vehiclesRouter.ts
import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { VehicleStatusQuery } from "../schemas";
import { VehicleService } from "../services/vehicleService";
import { z } from "zod";

/**
 * @openapi
 * tags:
 *   - name: Vehicles
 *     description: Vehicle APIs
 *
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 *
 *   schemas:
 *     Vehicle:
 *       type: object
 *       properties:
 *         id: { type: string, example: "veh_01" }
 *         plateNumber: { type: string, example: "B 1234 XX" }
 *         brand: { type: string, example: "Toyota" }
 *         model: { type: string, example: "Avanza" }
 *         year: { type: integer, example: 2020 }
 *
 *     VehicleStatus:
 *       type: object
 *       properties:
 *         vehicleId: { type: string, example: "veh_01" }
 *         date: { type: string, format: date, example: "2025-08-22" }
 *         status:
 *           type: string
 *           description: available | in_use | maintenance
 *           example: available
 *         odometer: { type: integer, example: 12345 }
 *
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         message: { type: string }
 */

// Query schema untuk list (pagination + search)
const ListVehiclesQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  q: z.string().trim().optional(),
});

export function vehiclesRouter(services: { vehicles: VehicleService }) {
  const r = Router();

  // semua endpoint butuh auth (Bearer access token)
  r.use(requireAuth);

  /**
   * @openapi
   * /vehicles:
   *   get:
   *     tags: [Vehicles]
   *     summary: List vehicles (paginated)
   *     security: [{ bearerAuth: [] }]
   *     parameters:
   *       - in: query
   *         name: page
   *         schema: { type: integer, minimum: 1, default: 1 }
   *       - in: query
   *         name: pageSize
   *         schema: { type: integer, minimum: 1, maximum: 100, default: 10 }
   *       - in: query
   *         name: q
   *         schema: { type: string }
   *         description: Search by plate/brand/model (case-insensitive)
   *     responses:
   *       '200':
   *         description: Paginated vehicles
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 items:
   *                   type: array
   *                   items: { $ref: '#/components/schemas/Vehicle' }
   *                 total: { type: integer, example: 123 }
   *                 page: { type: integer, example: 1 }
   *                 pageSize: { type: integer, example: 10 }
   *       '401':
   *         description: Unauthorized
   *         content:
   *           application/json:
   *             schema: { $ref: '#/components/schemas/ErrorResponse' }
   */
  r.get("/", validate({ query: ListVehiclesQuery }), async (req, res, next) => {
    try {
      const { page, pageSize, q } = req.query as unknown as {
        page: number;
        pageSize: number;
        q?: string;
      };

      // Jika service sudah mendukung paging/filter, pakai ini:
      if ((services.vehicles as any).listPaged) {
        const { items, total } = await (services.vehicles as any).listPaged({
          page,
          pageSize,
          q,
        });
        return res.json({ items, total, page, pageSize });
      }

      // Fallback: ambil semua lalu slice di router (cukup untuk dev; ganti ke DB-level paging di service)
      let items: any[] = await services.vehicles.list();

      if (q) {
        const qq = q.toLowerCase();
        items = items.filter((v) =>
          [v.plateNumber, v.brand, v.model]
            .filter(Boolean)
            .some((s: string) => s.toLowerCase().includes(qq))
        );
      }

      const total = items.length;
      const start = (page - 1) * pageSize;
      const paged = items.slice(start, start + pageSize);

      res.json({ items: paged, total, page, pageSize });
    } catch (err) {
      next(err);
    }
  });

  /**
   * @openapi
   * /vehicles/{id}:
   *   get:
   *     tags: [Vehicles]
   *     summary: Get vehicle by id
   *     security: [{ bearerAuth: [] }]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         description: Vehicle ID
   *         schema: { type: string, example: "veh_01" }
   *     responses:
   *       '200':
   *         description: Vehicle detail
   *         content:
   *           application/json:
   *             schema: { $ref: '#/components/schemas/Vehicle' }
   *       '404':
   *         description: Vehicle not found
   *         content:
   *           application/json:
   *             schema: { $ref: '#/components/schemas/ErrorResponse' }
   *       '401':
   *         description: Unauthorized
   *         content:
   *           application/json:
   *             schema: { $ref: '#/components/schemas/ErrorResponse' }
   */
  r.get("/:id", async (req, res) => {
    const v = await services.vehicles.get(req.params.id);
    if (!v) return res.status(404).json({ message: "Not found" });
    res.json(v);
  });

  /**
   * @openapi
   * /vehicles/{id}/status:
   *   get:
   *     tags: [Vehicles]
   *     summary: Get vehicle status by date
   *     security: [{ bearerAuth: [] }]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         description: Vehicle ID
   *         schema: { type: string, example: "veh_01" }
   *       - in: query
   *         name: date
   *         required: true
   *         description: Date to check (YYYY-MM-DD)
   *         schema: { type: string, format: date, example: "2025-08-22" }
   *     responses:
   *       '200':
   *         description: Vehicle status for the date
   *         content:
   *           application/json:
   *             schema: { $ref: '#/components/schemas/VehicleStatus' }
   *       '404':
   *         description: Vehicle not found
   *         content:
   *           application/json:
   *             schema: { $ref: '#/components/schemas/ErrorResponse' }
   *       '401':
   *         description: Unauthorized
   *         content:
   *           application/json:
   *             schema: { $ref: '#/components/schemas/ErrorResponse' }
   */
  r.get(
    "/:id/status",
    validate({ query: VehicleStatusQuery }),
    async (req, res) => {
      const v = await services.vehicles.get(req.params.id);
      if (!v) return res.status(404).json({ message: "Vehicle not found" });

      const s = await services.vehicles.statusByDate(
        req.params.id,
        String((req.query as any).date)
      );
      res.json(s);
    }
  );

  return r;
}
