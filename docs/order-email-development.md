# Test email notifications for an existing order

This helper invokes the deployed `send-order-emails` function. It sends real email requests for an existing order; it does not place an order, clear the cart, or change inventory. The function still enforces ownership and Resend's recipient restrictions.

1. Stop and restart the development server with `npm start` (or `npm start -- --configuration development`). Restarting is required after changing the development entrypoint.
2. Open `http://localhost:4200` and sign in as the customer who owns the existing order. Any application page works.
3. Open Chrome DevTools → Console and verify the helper is installed:

```js
typeof window.sweetCrumbEmailTest // "function"
```

4. Invoke it once with the full existing order UUID from Supabase:

```js
await window.sweetCrumbEmailTest('PASTE-EXISTING-ORDER-UUID-HERE');
```

The helper uses the running application's OrderService and current Supabase session. It waits for auth initialization, validates the UUID, and checks ownership before invoking the deployed function. It never places an order. It does not depend on Angular's global debugging API.

The temporary console function is installed only by `src/main.development.ts`, and only at the exact origin `http://localhost:4200`. The default/production bootstrap remains `src/main.ts`, which does not import or install this function. The helper module is therefore absent from production bundles, including when serving a production build on localhost. A runtime development-mode check provides a second safeguard. Concurrent invocations are rejected.

If the helper is undefined, restart `npm start`, reload the browser, check that the address is exactly `http://localhost:4200`, and select the page's top frame in DevTools. Do not use `127.0.0.1`, a preview host, or a production build.

The returned object contains only `state`, `customerEmailSent`, and `adminEmailSent`. States are `sent`, `partial`, `failed`, or `unknown`; booleans are `null` if unavailable. `sent` means the Edge Function reported both sends accepted, not proof of inbox delivery. The helper does not return technical provider responses, credentials, or tokens. Repeated invocations remain subject to the function's idempotency handling; do not repeatedly invoke it to diagnose a recipient restriction.

## Normal checkout

After the RPC succeeds, checkout marks the order complete, clears the cart, triggers inventory refresh, and starts `sendOrderEmails(order_id)` without waiting before navigating to confirmation. Notifications have their own per-customer, per-order in-memory signal state. Partial/failed notifications display a small warning; unknown outcomes use wording that does not claim definitive failure. Email errors never change the order result or restore the cart.

Notification state intentionally does not persist across a browser refresh. Loading confirmation does not resend emails. No automatic notification retry is performed.

## Verification

```sh
npm test -- --watch=false
node --test tests/angular-email-boundary.test.mjs supabase/functions/send-order-emails/handler.test.mjs
```

Tests mock all email sends. The source-boundary test checks Angular files for known Resend key patterns, the server secret variable, and direct Resend API URLs without printing source or secrets.

To remove the temporary console mechanism later, delete `src/main.development.ts`, `src/app/core/dev/order-email-test.ts` and its test, and remove the development `browser` override from `angular.json`. The temporary `sendOrderEmailsForDevelopment` service method can also be removed when no longer needed. Keep `sendOrderEmails` for normal checkout.
