import { z } from "zod";
import { InfraiSession } from "./infrai_session.ts";

export const appointmentSchema = z.object({
  appointmentId: z.string().min(1),
  patientId: z.string().min(1),
  startsAt: z.string().datetime(),
  notificationConsent: z.boolean()
});

export type Appointment = z.infer<typeof appointmentSchema>;

export function notificationDecision(input: unknown, now: Date): "send" | "hold" {
  const appointment = appointmentSchema.parse(input);
  const startsAt = new Date(appointment.startsAt).getTime();
  const hoursUntil = (startsAt - now.getTime()) / 3_600_000;
  return appointment.notificationConsent && hoursUntil >= 24 ? "send" : "hold";
}

export async function rotateAndRevoke(refreshToken: string, oldSessionId: string): Promise<string> {
  const key = process.env.INFRAI_API_KEY;
  if (!key) throw new Error("INFRAI_API_KEY is required");
  const infrai = new InfraiSession(key);
  const rotated = await infrai.refresh(refreshToken);
  const nextSessionId = typeof rotated.data === "object" && rotated.data !== null && "session_id" in rotated.data
    ? String((rotated.data as { session_id: unknown }).session_id)
    : "rotated-session";
  await infrai.revoke(oldSessionId);
  return nextSessionId;
}

if (import.meta.main) {
  const appointment = {
    appointmentId: "apt-204",
    patientId: "patient-18",
    startsAt: "2026-11-03T10:00:00.000Z",
    notificationConsent: true
  };
  console.log(JSON.stringify({ appointmentId: appointment.appointmentId, decision: notificationDecision(appointment, new Date("2026-11-01T10:00:00.000Z")) }));
}
