import { describe, it, expect, vi } from "vitest";
import { UserService } from "../../src/services/userService";

describe("user service", () => {
  it("list delegates to db", async () => {
    const fakeDB: any = { user: { findMany: vi.fn().mockResolvedValue([{ id: "1", email: "a@b.c" }]) } };
    const svc = new UserService(fakeDB);
    const list = await svc.list();
    expect(list.length).toBe(1);
  });
});
