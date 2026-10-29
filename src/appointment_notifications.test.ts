import test from "node:test";
import assert from "node:assert/strict";
import { notificationDecision } from "./appointment_notifications.ts";

test("holds a patient reminder when consent is absent", () => {
  const appointment = {
    appointmentId: "apt-204",
    patientId: "patient-18",
    startsAt: "2026-11-03T10:00:00.000Z",
    notificationConsent: false
  };
  assert.equal(notificationDecision(appointment, new Date("2026-11-01T10:00:00.000Z")), "hold");
});

test("sends a consented reminder at least a day ahead", () => {
  const appointment = {
    appointmentId: "apt-205",
    patientId: "patient-19",
    startsAt: "2026-11-03T10:00:00.000Z",
    notificationConsent: true
  };
  assert.equal(notificationDecision(appointment, new Date("2026-11-01T10:00:00.000Z")), "send");
});
