import { describe, it, expect, vi } from "vitest";
import { VehicleService } from "../../src/services/vehicleService";

describe("vehicle status", () => {
  it("returns derived available when no trips", async () => {
    const fakeDB: any = {
      vehicleStatus: { findUnique: vi.fn().mockResolvedValue(null) },
      trip: { findMany: vi.fn().mockResolvedValue([]) },
    };
    const svc = new VehicleService(fakeDB);
    const s = await svc.statusByDate("v1", "2025-08-20");
    expect(s.status).toBe("available");
  });
});
