// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { evaluateAdmin } from "@/lib/admin/guard-core";
import type { AppRole } from "@/lib/auth/roles";

// Guardie di ruolo del pannello. Il profilo (ruolo letto dal database) è simulato.
const getCurrentProfile = vi.fn();
vi.mock("@/lib/auth/session", () => ({ getCurrentProfile: () => getCurrentProfile() }));

const profile = (role: AppRole) => ({ id: "11111111-1111-4111-8111-111111111111", role });

describe("evaluateAdmin", () => {
  it("l'admin passa e restituisce il suo id", () => {
    expect(evaluateAdmin(profile("admin"))).toEqual({ ok: true, userId: "11111111-1111-4111-8111-111111111111" });
  });

  it("senza profilo: non autenticato", () => {
    expect(evaluateAdmin(null)).toEqual({ ok: false, reason: "unauthenticated" });
    expect(evaluateAdmin(undefined)).toEqual({ ok: false, reason: "unauthenticated" });
  });

  it("operatore e cliente: accesso negato", () => {
    expect(evaluateAdmin(profile("operatore"))).toEqual({ ok: false, reason: "forbidden" });
    expect(evaluateAdmin(profile("cliente"))).toEqual({ ok: false, reason: "forbidden" });
  });

  it("un ruolo sconosciuto non passa", () => {
    expect(evaluateAdmin(profile("superuser" as AppRole))).toEqual({ ok: false, reason: "forbidden" });
  });
});

describe("guardAdmin e guardAdminRoute (profilo simulato)", () => {
  beforeEach(() => getCurrentProfile.mockReset());

  it("guardAdmin rilegge il profilo a ogni chiamata", async () => {
    const { guardAdmin } = await import("@/lib/admin/guard");
    getCurrentProfile.mockResolvedValueOnce(profile("admin")).mockResolvedValueOnce(profile("cliente"));
    expect((await guardAdmin()).ok).toBe(true);
    expect((await guardAdmin()).ok).toBe(false);
    expect(getCurrentProfile).toHaveBeenCalledTimes(2);
  });

  it("guardAdminRoute: 401 senza sessione", async () => {
    const { guardAdminRoute } = await import("@/lib/admin/guard");
    getCurrentProfile.mockResolvedValue(null);
    const result = await guardAdminRoute();
    expect("userId" in result).toBe(false);
    expect((result as Response).status).toBe(401);
  });

  it("guardAdminRoute: 403 per un cliente, con cache disattivata", async () => {
    const { guardAdminRoute } = await import("@/lib/admin/guard");
    getCurrentProfile.mockResolvedValue(profile("cliente"));
    const result = (await guardAdminRoute()) as Response;
    expect(result.status).toBe(403);
    expect(result.headers.get("Cache-Control")).toBe("no-store");
  });

  it("guardAdminRoute: l'admin passa", async () => {
    const { guardAdminRoute } = await import("@/lib/admin/guard");
    getCurrentProfile.mockResolvedValue(profile("admin"));
    expect(await guardAdminRoute()).toEqual({ userId: "11111111-1111-4111-8111-111111111111" });
  });
});
