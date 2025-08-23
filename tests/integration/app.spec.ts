import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import { createApp } from "../../src/app";
import { AuthService } from "../../src/services/authService";
import { UserService } from "../../src/services/userService";
import { VehicleService } from "../../src/services/vehicleService";
import { ReportService } from "../../src/services/reportService";

// Pastikan SECRET sama dengan yang dipakai middleware verify
process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || "test-secret";
const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET!;


const fakeServices = (overrides?: Partial<any>) => ({
  auth: {
    register: async (e: string) => ({ id: "u1", email: e }),
    // Kembalikan JWT yang ditandatangani secret yang sama dengan middleware
    login: async (_e: string, _p: string) => {
      const user = { id: "u1", email: "user@example.com", role: "user" };
      const accessToken = jwt.sign(
        { sub: user.id, email: user.email, role: user.role },
        ACCESS_SECRET,
        { expiresIn: "15m" }
      );
      const refreshToken = "rt";
      return { user, accessToken, refreshToken };
    },
    refresh: async () => ({
      accessToken: jwt.sign({ sub: "u1" }, ACCESS_SECRET, { expiresIn: "15m" }),
    }),
    logout: async () => {},
  } as unknown as AuthService,

  users: {
    list: async () => [{ id: "u1", email: "user@example.com" }],
    get: async () => ({ id: "u1", email: "user@example.com" }),
  } as unknown as UserService,

  vehicles: {
    list: async () => [{ id: "v1", plateNumber: "B-1234-XYZ" }],
    get: async (id: string) => ({ id, plateNumber: "B-1234-XYZ" }),
    statusByDate: async () => ({ status: "available" }),
    // kalau kamu punya listPaged di service produksi, boleh tambahkan mock di sini
  } as unknown as VehicleService,

  reports: {
    // harus terima (from, to)
    buildTripsWorkbook: async (_from: string, _to: string) => {
      // bikin ArrayBuffer kecil (header ZIP "PK\x03\x04" biar mirip .xlsx)
      const u8 = new Uint8Array([
        0x50, 0x4b, 0x03, 0x04, 0x14, 0x00, 0x00, 0x00,
      ]);
      const arrBuf = u8.buffer;

      return {
        xlsx: {
          // exceljs -> Promise<ArrayBuffer>
          writeBuffer: async () => arrBuf,
        },
      } as any;
    },
  } as unknown as ReportService,

  ...overrides,
});

describe("integration - endpoints", () => {
  let app: ReturnType<typeof createApp>;
  let agent: request.SuperAgentTest;
  let token = "";

  beforeAll(async () => {
    app = createApp(fakeServices());
    agent = request.agent(app); // simpan cookie otomatis

    const login = await agent
      .post("/auth/login")
      .send({ email: "user@example.com", password: "password123" });

    expect(login.statusCode).toBe(200);
    token = login.body?.accessToken ?? "";
    expect(typeof token).toBe("string");
  });

  it("POST /auth/login works", async () => {
    const res = await agent
      .post("/auth/login")
      .send({ email: "user@example.com", password: "password123" });

    expect(res.statusCode).toBe(200);
    expect(res.body.user.email).toContain("@");
    expect(typeof res.body.accessToken).toBe("string");
  });

  it("GET /vehicles lists vehicles", async () => {
    const res = await agent
      .get("/vehicles?page=1&pageSize=50")
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.items)).toBe(true);
    expect(typeof res.body.total).toBe("number");
  });

  it("GET /reports/trips.xlsx returns file", async () => {
    const res = await agent
      .get("/reports/trips.xlsx?from=2025-01-01&to=2025-01-31")
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toContain("spreadsheet");
    expect(res.text || res.body).toBeTruthy();
  });
});
