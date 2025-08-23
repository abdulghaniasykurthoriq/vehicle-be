import { describe, it, expect, vi } from "vitest";
import { ReportService } from "../../src/services/reportService";

const fakeDB: any = {
  trip: { findMany: vi.fn().mockResolvedValue([]) }
};

describe("report service", () => {
  it("creates workbook", async () => {
    const svc = new ReportService(fakeDB);
    const wb = await svc.buildTripsWorkbook("2025-01-01", "2025-01-31");
    expect(wb.worksheets.length).toBe(1);
  });
});
