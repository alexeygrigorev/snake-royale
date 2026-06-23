import { describe, expect, it, vi } from "vitest";
import { createHttpServices } from "./http";

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: { "Content-Type": "application/json", ...init.headers },
  });
}

describe("http services", () => {
  it("posts credentials to the backend with cookies enabled", async () => {
    const fetcher = vi.fn(async () =>
      jsonResponse({ user: { id: "user_1", username: "alice" }, token: "token_1" }),
    );
    const services = createHttpServices({ baseUrl: "http://api.test/", fetcher });

    const result = await services.login("alice", "password123");

    expect(result.user.username).toBe("alice");
    expect(fetcher).toHaveBeenCalledWith(
      "http://api.test/auth/login",
      expect.objectContaining({
        method: "POST",
        credentials: "include",
        body: JSON.stringify({ username: "alice", password: "password123" }),
      }),
    );
  });

  it("returns null when there is no active session", async () => {
    const fetcher = vi.fn(async () => new Response(null, { status: 204 }));
    const services = createHttpServices({ baseUrl: "http://api.test", fetcher });

    await expect(services.currentUser()).resolves.toBeNull();
  });

  it("uses backend error messages", async () => {
    const fetcher = vi.fn(async () =>
      jsonResponse({ message: "Invalid username or password" }, { status: 401 }),
    );
    const services = createHttpServices({ baseUrl: "http://api.test", fetcher });

    await expect(services.login("alice", "wrong")).rejects.toThrow("Invalid username or password");
  });
});
