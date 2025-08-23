import { describe, it, expect } from "vitest";
import { signAccessToken, verifyAccessToken } from "../../src/utils/jwt";

describe("jwt utils", () => {
  it("signs & verifies access token", () => {
    const token = signAccessToken({ sub: "u1", email: "a@b.c", role: "user" });
    const payload = verifyAccessToken(token);
    expect(payload.sub).toBe("u1");
    expect(payload.type).toBe("access");
  });
});
