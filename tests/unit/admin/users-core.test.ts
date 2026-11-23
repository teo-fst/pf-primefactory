// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import {
  processInvite,
  processRoleChange,
  wouldRemoveLastAdmin,
  type InviteDeps,
  type RoleChangeDeps,
} from "@/lib/admin/users-core";

const A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const C = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

const form = (values: Record<string, string>) => ({
  get: (name: string) => (name in values ? values[name] : null),
});

describe("wouldRemoveLastAdmin", () => {
  it("l'unico admin non può perdere il ruolo", () => {
    expect(wouldRemoveLastAdmin([A], A, "cliente")).toBe(true);
    expect(wouldRemoveLastAdmin([A], A, "operatore")).toBe(true);
  });

  it("con un altro admin si può togliere il ruolo", () => {
    expect(wouldRemoveLastAdmin([A, B], A, "cliente")).toBe(false);
  });

  it("restare admin o promuovere qualcuno non toglie niente", () => {
    expect(wouldRemoveLastAdmin([A], A, "admin")).toBe(false);
    expect(wouldRemoveLastAdmin([A], B, "operatore")).toBe(false);
    expect(wouldRemoveLastAdmin([], B, "admin")).toBe(false);
  });
});

describe("processRoleChange", () => {
  const deps = (adminIds: string[], setRole: RoleChangeDeps["setRole"]): RoleChangeDeps => ({
    listAdminIds: async () => adminIds,
    setRole,
  });

  it("cambia il ruolo di un altro utente", async () => {
    const setRole = vi.fn().mockResolvedValue({ ok: true });
    const out = await processRoleChange(form({ user_id: B, role: "operatore" }), deps([A], setRole));
    expect(out).toEqual({ status: "ok" });
    expect(setRole).toHaveBeenCalledWith(B, "operatore");
  });

  it("rifiuta di togliere il ruolo all'unico admin, senza scrivere nulla", async () => {
    const setRole = vi.fn();
    const out = await processRoleChange(form({ user_id: A, role: "cliente" }), deps([A], setRole));
    expect(out).toEqual({ status: "error", code: "last_admin" });
    expect(setRole).not.toHaveBeenCalled();
  });

  it("permette a un admin di cedere il ruolo se ce n'è un altro", async () => {
    const setRole = vi.fn().mockResolvedValue({ ok: true });
    const out = await processRoleChange(form({ user_id: A, role: "operatore" }), deps([A, B], setRole));
    expect(out).toEqual({ status: "ok" });
  });

  it("se il database blocca l'ultimo admin (trigger), lo riporta", async () => {
    const setRole = vi.fn().mockResolvedValue({ ok: false, lastAdmin: true });
    const out = await processRoleChange(form({ user_id: B, role: "cliente" }), deps([A, B], setRole));
    expect(out).toEqual({ status: "error", code: "last_admin" });
  });

  it("errore generico di scrittura", async () => {
    const setRole = vi.fn().mockResolvedValue({ ok: false, lastAdmin: false });
    const out = await processRoleChange(form({ user_id: B, role: "admin" }), deps([A], setRole));
    expect(out).toEqual({ status: "error", code: "failed" });
  });

  it("id o ruolo non validi: nessuna chiamata", async () => {
    const setRole = vi.fn();
    const invalid: Record<string, string>[] = [
      { user_id: "non-un-uuid", role: "admin" },
      { user_id: B, role: "superuser" },
      { user_id: B, role: "" },
      { role: "admin" },
    ];
    for (const bad of invalid) {
      expect(await processRoleChange(form(bad), deps([A], setRole))).toEqual({ status: "error", code: "invalid" });
    }
    expect(setRole).not.toHaveBeenCalled();
  });
});

describe("processInvite", () => {
  const deps = (inviteByEmail: InviteDeps["inviteByEmail"], setRole: InviteDeps["setRole"]): InviteDeps => ({
    inviteByEmail,
    setRole,
  });

  it("invita e imposta il ruolo", async () => {
    const invite = vi.fn().mockResolvedValue({ userId: C });
    const setRole = vi.fn().mockResolvedValue(true);
    const out = await processInvite(form({ email: " Socio@Esempio.IT ", role: "admin", full_name: "Mario" }), deps(invite, setRole));
    expect(out).toEqual({ status: "ok", email: "socio@esempio.it" });
    expect(invite).toHaveBeenCalledWith("socio@esempio.it", "Mario");
    expect(setRole).toHaveBeenCalledWith(C, "admin");
  });

  it("non si invita nessuno come cliente", async () => {
    const invite = vi.fn();
    const out = await processInvite(form({ email: "a@b.it", role: "cliente" }), deps(invite, vi.fn()));
    expect(out).toEqual({ status: "error", code: "invalid_role" });
    expect(invite).not.toHaveBeenCalled();
  });

  it("email non valida: nessun invito", async () => {
    const invite = vi.fn();
    for (const email of ["", "non-una-email", "a@", "x".repeat(260) + "@b.it"]) {
      expect(await processInvite(form({ email, role: "operatore" }), deps(invite, vi.fn()))).toEqual({
        status: "error",
        code: "invalid_email",
      });
    }
    expect(invite).not.toHaveBeenCalled();
  });

  it("utente già registrato", async () => {
    const setRole = vi.fn();
    const out = await processInvite(form({ email: "a@b.it", role: "operatore" }), deps(vi.fn().mockResolvedValue({ error: "exists" }), setRole));
    expect(out).toEqual({ status: "error", code: "exists" });
    expect(setRole).not.toHaveBeenCalled();
  });

  it("invito andato ma ruolo non scritto", async () => {
    const out = await processInvite(
      form({ email: "a@b.it", role: "operatore" }),
      deps(vi.fn().mockResolvedValue({ userId: C }), vi.fn().mockResolvedValue(false)),
    );
    expect(out).toEqual({ status: "error", code: "role_failed" });
  });
});
