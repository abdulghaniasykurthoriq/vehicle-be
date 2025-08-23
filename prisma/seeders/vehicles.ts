// prisma/seeders/vehicles.ts
import { PrismaClient } from "@prisma/client";

const BRANDS = [
  { brand: "Toyota", models: ["Avanza", "Rush", "Innova"] },
  { brand: "Honda", models: ["Brio", "BR-V", "HR-V"] },
  { brand: "Suzuki", models: ["Ertiga", "XL7"] },
  { brand: "Mitsubishi", models: ["Xpander", "Pajero Sport"] },
  { brand: "Daihatsu", models: ["Xenia", "Terios"] },
];

const AREAS = ["B", "D", "E", "F", "H", "K", "L", "N", "W"];

function makePlate(i: number) {
  const area = AREAS[i % AREAS.length];
  const num = 1000 + i;
  const l1 = String.fromCharCode(65 + (i % 26));
  const l2 = String.fromCharCode(65 + ((i * 7) % 26));
  return `${area}-${num}-${l1}${l2}`; // contoh: B-1000-AA
}

/** Seed 20 kendaraan (default) secara idempotent (upsert by plateNumber). */
export async function seedVehicles(prisma: PrismaClient, count = 20) {
  const out: { id: string; plateNumber: string }[] = [];

  for (let i = 0; i < count; i++) {
    const brandIdx = i % BRANDS.length;
    const brandObj = BRANDS[brandIdx];
    if (!brandObj) {
      throw new Error(`Invalid brand index: ${brandIdx}`);
    }
    const brand = brandObj.brand;
    const model = brandObj.models[i % brandObj.models.length];
    const year = 2016 + (i % 10);
    const plateNumber = makePlate(i);

    const v = await prisma.vehicle.upsert({
      where: { plateNumber },
      update: { model },
      create: { plateNumber, model },
    });

    out.push({ id: v.id, plateNumber: v.plateNumber });
  }

  return out;
}
