# send-order-emails

Server-only Edge Function for the existing pickup-order workflow. No Angular, SQL, order, status, or inventory changes are made. This function is not deployed or wired into checkout yet.

## Environment and authorization

Uses `SUPABASE_URL`, the standard hosted `SUPABASE_ANON_KEY` (or a configured `SUPABASE_PUBLISHABLE_KEY`), and `RESEND_API_KEY`. All values are read at runtime; none belong in source files. No privileged database client is created.

POST with `Authorization: Bearer <customer access token>`, `Content-Type: application/json`, and only `{ "order_id": "<uuid>" }`. The function verifies the token with `auth.getUser()`, reads the order using the customer's Authorization header, and checks `order.user_id`. A hidden/missing order or ownership mismatch returns 403 without revealing whether another customer's order exists. Historical order items are read through the same RLS-scoped client. Existing SELECT policies must permit these reads.

## Email behavior

Both messages use `SweetCrumb <onboarding@resend.dev>`. The customer recipient is the stored `order.customer_email`; the administrator is fixed server-side to `hussaintouhid@gmail.com`. Sender and recipient are not browser parameters. Email content is built from stored order records with escaped HTML, a plain-text alternative, USD formatting, and optional special instructions. Current stored status is displayed (normally Received immediately after placement). Pickup date/time is treated as bakery-local wall time; no timezone conversion is invented.

Resend testing-sender restrictions may prevent delivery to customers or the administrator unless the account permits those recipients. Each send is attempted independently. Provider bodies are not echoed or logged; a safe explanation, provider HTTP status, and result code identify rejection, throttling, idempotency conflicts, and uncertain network outcomes.

- HTTP 200: both requests accepted by Resend.
- HTTP 207: one request accepted; inspect both results.
- HTTP 502: neither request confirmed, or database read failure.
- HTTP 400/401/403/405/413/415: invalid request, authentication, authorization, method, body size, or content type.
- HTTP 409: stored order has no item details.
- HTTP 500: missing configuration or unexpected server failure.

Send responses contain `success`, `customer_email_sent`, `admin_email_sent`, and separate `customer_email` / `admin_email` objects with `status` (`accepted`, `failed`, or `unknown`). `sent: true` means Resend accepted the request, not confirmed inbox delivery. An unknown result must not be described as definitely unsent.

Stable per-order, per-recipient `Idempotency-Key` headers reduce duplicate sends on retries. Resend retains these keys for 24 hours; this is not durable exactly-once delivery or a permanent resend limit. Retries with changed email content can return an idempotency conflict. A future persistent delivery ledger/rate limit would require separate work; no database changes are included here. There are no automatic retries.

## CORS

Allows exactly `http://localhost:4200` and `https://sweetcrumb-cupcakes.vercel.app`; includes `Vary: Origin`. Supports POST/OPTIONS and Supabase client headers. Requests with another Origin are rejected. Origin-less server requests are allowed but must pass the same token and ownership checks. CORS is not a replacement for authorization.

## Local verification

From the project root:

```sh
node --test supabase/functions/send-order-emails/handler.test.mjs
```

The tests use the project's existing TypeScript dependency and Node's test runner. All environment, Supabase, and Resend interactions are mocked; no mail is sent. Deno is not installed in the current development environment, so native Deno/Edge runtime verification remains outstanding. The entrypoint pins Supabase JS to 2.116.0.

References: [Resend send API](https://resend.com/docs/api-reference/emails/send-email), [idempotency window](https://resend.com/docs/dashboard/emails/idempotency-keys), [Supabase Edge environment](https://supabase.com/docs/guides/functions/secrets).
