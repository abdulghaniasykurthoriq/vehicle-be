// src/services/reportService.ts
import ExcelJS from "exceljs";
import dayjs from "dayjs";
import type { Prisma, PrismaClient } from "@prisma/client";

// Trip + relasi yang kamu include
type TripWithRelations = Prisma.TripGetPayload<{
  include: { vehicle: true; user: true };
}>;

export class ReportService {
  // pastikan db itu PrismaClient, bukan tipe custom "DB" yang bikin any
  constructor(private db: PrismaClient) {}

  async buildTripsWorkbook(fromISO: string, toISO: string) {
    const from = dayjs(fromISO).toDate();
    const to = dayjs(toISO).toDate();

    // beri anotasi ke trips supaya forEach param 't' punya tipe
    const trips: TripWithRelations[] = await this.db.trip.findMany({
      where: { startTime: { gte: from }, endTime: { lte: to } },
      include: { vehicle: true, user: true },
    });

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Trips");

    ws.addRow([
      "Trip ID",
      "Vehicle",
      "Driver",
      "Start Time",
      "End Time",
      "Distance (km)",
      "From",
      "To",
    ]);

    trips.forEach((t) => {
      ws.addRow([
        t.id,
        t.vehicle.plateNumber,
        t.user?.email ?? "-",
        dayjs(t.startTime).format("YYYY-MM-DD HH:mm"),
        t.endTime ? dayjs(t.endTime).format("YYYY-MM-DD HH:mm") : "-",
        t.distanceKm ?? "-",
        t.startPlace ?? "-",
        t.endPlace ?? "-",
      ]);
    });

    return wb;
  }
}

// import ExcelJS from "exceljs";
// import { DB } from "../db";
// import dayjs from "dayjs";

// export class ReportService {
//   constructor(private db: DB) {}

//   async buildTripsWorkbook(fromISO: string, toISO: string) {
//     const from = dayjs(fromISO).toDate();
//     const to = dayjs(toISO).toDate();
//     const trips = await this.db.trip.findMany({
//       where: { startTime: { gte: from }, endTime: { lte: to } },
//       include: { vehicle: true, user: true }
//     });

//     const wb = new ExcelJS.Workbook();
//     const ws = wb.addWorksheet("Trips");
//     ws.addRow(["Trip ID", "Vehicle", "Driver", "Start Time", "End Time", "Distance (km)", "From", "To"]);
//     trips.forEach(t => {
//       ws.addRow([
//         t.id,
//         t.vehicle.plateNumber,
//         t.user?.email ?? "-",
//         dayjs(t.startTime).format("YYYY-MM-DD HH:mm"),
//         t.endTime ? dayjs(t.endTime).format("YYYY-MM-DD HH:mm") : "-",
//         t.distanceKm ?? "-",
//         t.startPlace ?? "-",
//         t.endPlace ?? "-"
//       ]);
//     });
//     return wb;
//   }
// }
