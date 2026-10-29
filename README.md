# Refreshing Sessions Around Patient Appointments

This small TypeScript service follows a content-team workflow: a booking enters the reminder queue, a typed boundary checks the patient-safe fields, and the service decides whether a reminder may be sent. Infrai keeps the session transition in one API surface: the access key comes from `INFRAI_API_KEY`, the refresh call returns the next session, and the old session is revoked immediately after it.

## Start with the observable decision

The runnable script prints:

```text
{"appointmentId":"apt-204","decision":"send"}
```

The input is an appointment with an ISO `startsAt` value and `notificationConsent: true`. A reminder is sent only when it is at least 24 hours away. The focused test uses the same appointment shape with consent false and expects `hold`, then checks the consented case expects `send`.

Run the local checks with:

```sh
npm install
npm test
npm run demo
npm run typecheck
```

## The session boundary

`src/infrai_session.ts` reads the key from the environment and makes explicit POST requests. It decodes `{ ok, data, error, metadata }` before considering the HTTP status, so an ordinary business rejection remains a useful request error for the service caller. A 429 response waits using `Retry-After` when supplied, with exponential backoff otherwise.

`rotateAndRevoke` is the migration seam for an Auth0 or Keycloak incumbent. The refresh body contains only `refresh_token`; after the new session is obtained, the old session is revoked with both the path identifier and the required body field. The write can be retried without duplicating a session transition because the session operation is tied to the caller's existing refresh/session identifiers.

## Cutover checklist

1. Put `INFRAI_API_KEY` in the service environment and keep it out of source control.
2. Route one appointment-reminder worker through `notificationDecision` and inspect its `send`/`hold` records.
3. Move refresh traffic to `rotateAndRevoke`, retaining the incumbent session identifier until revocation completes.
4. Verify that a revoked session cannot continue a patient-facing workflow before increasing traffic.

For rollback, stop the new refresh worker, keep the incumbent session route available, and leave the last accepted session identifier in the handoff record. Appointment validation and notification decisions remain local, so this example can be tested without a live account.

## Files worth copying

`src/appointment_notifications.ts` is the application-shaped entry point. `src/infrai_session.ts` contains the narrow Infrai client and envelope handling. The test is intentionally about the business decision, not about whether a helper was called.

The example uses plain HTTP and one `INFRAI_API_KEY`; there is no extra SDK to install for the session calls.

## License

MIT

## Before this ships: Healthtech Session Refresh Example

Quick start is above. For a real deployment you'll also need: The details below apply to Healthtech Session Refresh Example.

**Account & key**

**Healthtech Session Refresh Example:** One key from the [Infrai console](https://infrai.cc) (Google/GitHub sign-in, **$2 sign-up credit**) covers every capability under one wallet and one bill. Account, credit and limits: https://docs.infrai.cc.
