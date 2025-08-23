import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { ReportQuery } from "../schemas";
import { ReportService } from "../services/reportService";

/**
 * @openapi
 * tags:
 *   name: Reports
 *   description: Reporting
 */
export function reportsRouter(services: { reports: ReportService }) {
  const r = Router();
  r.use(requireAuth);

  /**
   * @openapi
   * /reports/trips.xlsx:
   *   get:
   *     tags: [Reports]
   *     summary: Generate trips report (.xlsx)
   *     security: [{ bearerAuth: [] }]
   *     parameters:
   *       - in: query
   *         name: from
   *         required: true
   *         schema: { type: string, format: date }
   *         description: Start date (YYYY-MM-DD)
   *       - in: query
   *         name: to
   *         required: true
   *         schema: { type: string, format: date }
   *         description: End date (YYYY-MM-DD)
   *     responses:
   *       '200':
   *         description: Excel file
   *         content:
   *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
   *             schema: { type: string, format: binary }
   *       '400':
   *         description: Validation error
   *       '401':
   *         description: Unauthorized
   */
  r.get(
    "/trips.xlsx",
    validate({ query: ReportQuery }),
    async (req, res, next) => {
      try {
        const { from, to } = req.query as { from: string; to: string };

        // Bangun workbook dari service
        const wb = await services.reports.buildTripsWorkbook(from, to);

        // Lebih stabil: kirim sebagai Buffer
        const arrBuf = await wb.xlsx.writeBuffer(); // ArrayBuffer
        const buf = Buffer.from(arrBuf as ArrayBuffer); // jadikan Node Buffer

        const filename = `trips_${from}_${to}.xlsx`;
        res
          .status(200)
          .set({
            "Content-Type":
              "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "Content-Disposition": `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(
              filename
            )}`,
            "Content-Length": String(buf.length),
            // agar FE bisa baca header ini (kalau perlu ambil nama file)
            "Access-Control-Expose-Headers": "Content-Disposition",
            "Cache-Control": "no-store",
          })
          .send(buf);
      } catch (err) {
        next(err);
      }
    }
  );

  return r;
}
