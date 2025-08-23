import { DB } from "../db";
import dayjs from "dayjs";

export class VehicleService {
  constructor(private db: DB) {}

  list() { return this.db.vehicle.findMany(); }
  get(id: string) { return this.db.vehicle.findUnique({ where: { id } }); }

  async statusByDate(vehicleId: string, dateISO: string) {
    const start = dayjs(dateISO).startOf("day").toDate();
    const end = dayjs(dateISO).endOf("day").toDate();
    const vs = await this.db.vehicleStatus.findUnique({
      where: { vehicleId_date: { vehicleId, date: start } }
    });
    if (vs) return vs;

    // Fallback: infer from trips
    const trips = await this.db.trip.findMany({ where: { vehicleId, startTime: { gte: start, lte: end } } });
    const status = trips.length > 0 ? "in_use" : "available";
    return { id: "derived", vehicleId, date: start, status, odometer: null, note: "derived from trips" };
  }
}
