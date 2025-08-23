import { describe, it, expect } from "vitest";
import bcrypt from "bcryptjs";

describe("password hashing", () => {
  it("hashes & verifies", async () => {
    const hash = await bcrypt.hash("password123", 10);
    const ok = await bcrypt.compare("password123", hash);
    expect(ok).toBe(true);
  });
});
