// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const runNotifyBatch = vi.fn();
vi.mock("@/lib/notify", () => ({ runNotifyBatch: (...args: unknown[]) => runNotifyBatch(...args) }));

import { POST } from "../../../src/app/api/cron/notifiche/route";

const SECRET = "prova-prova-prova-prova";

function call(headers: Record<string, string> = {}): Promise<Response> {
  return POST(new Request("http://localhost/api/cron/notifiche", { method: "POST", headers }));
}

describe("POST /api/cron/notifiche", () => {
  beforeEach(() => {
    runNotifyBatch.mockReset();
    runNotifyBatch.mockResolvedValue({ enabled: true, claimed: 2, processed: 2, failed: 0, exhausted: 0 });
    vi.stubEnv("CRON_SECRET", SECRET);
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("401 senza header", async () => {
    const res = await call();
    expect(res.status).toBe(401);
    expect(res.headers.get("www-authenticate")).toBe("Bearer");
    expect(runNotifyBatch).not.toHaveBeenCalled();
  });

  it("401 con segreto sbagliato o schema diverso", async () => {
    expect((await call({ authorization: "Bearer sbagliato" })).status).toBe(401);
    expect((await call({ authorization: `Basic ${SECRET}` })).status).toBe(401);
    expect(runNotifyBatch).not.toHaveBeenCalled();
  });

  it("200 con il segreto giusto, e risponde solo con numeri", async () => {
    const res = await call({ authorization: `Bearer ${SECRET}` });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ enabled: true, claimed: 2, processed: 2, failed: 0, exhausted: 0 });
    expect(runNotifyBatch).toHaveBeenCalledTimes(1);
  });

  it("503 se CRON_SECRET non è configurato, anche con un token qualsiasi", async () => {
    vi.stubEnv("CRON_SECRET", "");
    const res = await call({ authorization: "Bearer qualsiasi" });
    expect(res.status).toBe(503);
    expect(runNotifyBatch).not.toHaveBeenCalled();
  });

  it("500 senza dettagli se il lotto solleva un errore", async () => {
    runNotifyBatch.mockRejectedValue(new Error("password=segreta host=db.interno"));
    const res = await call({ authorization: `Bearer ${SECRET}` });
    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toContain("segreta");
  });
});
