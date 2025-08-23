// prisma/seed.ts
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import dayjs from "dayjs";
import bcrypt from "bcryptjs";
import { seedVehicles } from "./seeders/vehicles";

const prisma = new PrismaClient();

async function main() {
  // --- HAPUS DATA TERKAIT DULU (biar idempotent saat seed ulang) ---
  await prisma.trip.deleteMany({});
  await prisma.vehicleStatus.deleteMany({});
  // (biarkan tabel user/vehicle tidak dihapus, karena kita pakai upsert)

  // --- USERS ---
  const hash = await bcrypt.hash("password123", 10);

  // ganti ke "password" kalau field di schema kamu bukan "passwordHash"
  const admin = await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: {
      email: "admin@example.com",
      name: "Admin",
      passwordHash: hash,
      role: "admin",
    },
  });

  const user = await prisma.user.upsert({
    where: { email: "user@example.com" },
    update: {},
    create: {
      email: "user@example.com",
      name: "User",
      passwordHash: hash,
      role: "user",
    },
  });

  // --- VEHICLES (20 data) ---
  const vehicles = await seedVehicles(prisma, 20);
  const v1 = vehicles[0];
  const v2 = vehicles[1];

  // --- TRIPS (contoh untuk v1) ---
  await prisma.trip.createMany({
    data: [
      {
        vehicleId: v1.id,
        userId: user.id,
        startTime: dayjs()
          .subtract(2, "day")
          .hour(8)
          .minute(0)
          .second(0)
          .millisecond(0)
          .toDate(),
        endTime: dayjs()
          .subtract(2, "day")
          .hour(10)
          .minute(0)
          .second(0)
          .millisecond(0)
          .toDate(),
        distanceKm: 42.1,
        startPlace: "Indramayu",
        endPlace: "Bandung",
      },
      {
        vehicleId: v1.id,
        userId: user.id,
        startTime: dayjs()
          .subtract(1, "day")
          .hour(14)
          .minute(0)
          .second(0)
          .millisecond(0)
          .toDate(),
        endTime: dayjs()
          .subtract(1, "day")
          .hour(16)
          .minute(0)
          .second(0)
          .millisecond(0)
          .toDate(),
        distanceKm: 38.4,
        startPlace: "Bandung",
        endPlace: "Indramayu",
      },
    ],
  });

  // --- VEHICLE STATUSES (contoh untuk v1 & v2) ---
  await prisma.vehicleStatus.createMany({
    data: [
      {
        vehicleId: v1.id,
        date: dayjs().startOf("day").toDate(),
        status: "available",
        odometer: 12345,
      },
      {
        vehicleId: v1.id,
        date: dayjs().subtract(1, "day").startOf("day").toDate(),
        status: "in_use",
        odometer: 12300,
      },
      {
        vehicleId: v2.id,
        date: dayjs().startOf("day").toDate(),
        status: "maintenance",
        odometer: 5800,
      },
    ],
  });

  console.log("✅ Seed completed");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
