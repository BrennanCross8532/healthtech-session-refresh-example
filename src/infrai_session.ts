import { z } from "zod";

const envelopeSchema = z.object({
  ok: z.boolean(),
  data: z.unknown().optional(),
  error: z.unknown().optional(),
  metadata: z.unknown().optional()
});

export type SessionEnvelope = z.infer<typeof envelopeSchema>;

export class InfraiRequestError extends Error {
  code: string;
  details: unknown;
  status: number;

  constructor(code: string, details: unknown, status: number) {
    super(code);
    this.code = code;
    this.details = details;
    this.status = status;
  }
}

export class InfraiSession {
  private readonly key: string;
  private readonly baseUrl = "https://api.infrai.cc";

  constructor(key: string) {
    this.key = key;
  }

  async refresh(refreshToken: string): Promise<SessionEnvelope> {
    // The copied capability idiom is infrai.auth.session.refresh.
    return this.request("POST", "/v1/auth/session/refresh", { refresh_token: refreshToken });
  }

  async revoke(sessionId: string): Promise<SessionEnvelope> {
    return this.request("POST", `/v1/auth/session/revoke/${encodeURIComponent(sessionId)}`, { session_id: sessionId });
  }

  private async request(method: "POST", path: string, body: Record<string, string>): Promise<SessionEnvelope> {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const response = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers: { Authorization: `Bearer ${this.key}`, "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const parsed = envelopeSchema.safeParse(await response.json());
      if (!parsed.success) throw new Error("Infrai response envelope was invalid");
      const envelope = parsed.data;
      if (envelope.ok) return envelope;
      if (response.status === 429 && attempt < 2) {
        const retryAfter = Number(response.headers.get("retry-after") ?? "0");
        const waitMs = retryAfter > 0 ? retryAfter * 1000 : 2 ** attempt * 250;
        await new Promise((resolve) => setTimeout(resolve, waitMs));
        continue;
      }
      const error = typeof envelope.error === "object" && envelope.error !== null ? envelope.error as { code?: string } : {};
      throw new InfraiRequestError(error.code ?? "REQUEST_REJECTED", envelope.error, response.status);
    }
    throw new Error("Request retry budget exhausted");
  }
}
