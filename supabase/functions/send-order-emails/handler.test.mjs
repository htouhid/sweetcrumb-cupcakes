// Run from the project root: node --test supabase/functions/send-order-emails/handler.test.mjs
// TypeScript is transpiled in memory; all network and environment access is mocked.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
const source = await readFile(new URL('./handler.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
});
const { createHandler, buildEmail } = await import(
  `data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`
);
const id = '11111111-1111-4111-8111-111111111111';
const order = {
  id,
  user_id: 'customer-1',
  order_number: 'SC-TEST',
  customer_name: '<script>Avery</script>',
  customer_email: 'customer@example.test',
  customer_phone: '123',
  pickup_date: '2026-10-01',
  pickup_time: '14:30:00',
  special_instructions: '<img src=x onerror=alert(1)>',
  subtotal: '9.00',
  status: 'received',
};
const items = [{ product_name: 'Cake & cream', quantity: 2, unit_price: '4.50', total: '9.00' }];
function setup({
  owner = order.user_id,
  hidden = false,
  valid = true,
  responses = [200, 200],
} = {}) {
  const sent = [];
  const queries = [];
  const client = {
    auth: {
      getUser: async (token) => {
        assert.equal(token, 'test-token');
        return { data: { user: valid ? { id: 'customer-1' } : null }, error: null };
      },
    },
    from(table) {
      queries.push(table);
      const query = {
        select() {
          return query;
        },
        eq(column, value) {
          assert.equal(value, id);
          return query;
        },
        order() {
          return query;
        },
        range() {
          return query;
        },
        maybeSingle: async () => ({
          data: hidden ? null : { ...order, user_id: owner },
          error: null,
        }),
        returns: async () => ({ data: items, error: null }),
      };
      return query;
    },
  };
  const handler = createHandler({
    env: (name) =>
      ({
        SUPABASE_URL: 'https://example.test',
        SUPABASE_ANON_KEY: 'public-test-key',
        RESEND_API_KEY: 'fake-test-secret',
      })[name],
    createClient(url, key, options) {
      assert.equal(key, 'public-test-key');
      assert.equal(options.global.headers.Authorization, 'Bearer test-token');
      return client;
    },
    fetch: async (url, options) => {
      assert.equal(url, 'https://api.resend.com/emails');
      sent.push({ payload: JSON.parse(options.body), headers: options.headers });
      const status = responses[sent.length - 1];
      if (status === 0) throw Error('network');
      return new Response(
        JSON.stringify(
          status === 200 ? { id: 'email-id' } : { message: 'provider-private-detail' },
        ),
        { status },
      );
    },
  });
  return { handler, sent, queries };
}
function request(body = { order_id: id }, overrides = {}) {
  return new Request('https://example.test/send-order-emails', {
    method: 'POST',
    headers: {
      origin: 'http://localhost:4200',
      authorization: 'Bearer test-token',
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
    ...overrides,
  });
}
test('sends both trusted emails with separate retry keys', async () => {
  const { handler, sent, queries } = setup();
  const response = await handler(request());
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.customer_email_sent, true);
  assert.equal(data.admin_email_sent, true);
  assert.deepEqual(queries, ['orders', 'order_items']);
  assert.deepEqual(sent[0].payload.to, ['customer@example.test']);
  assert.deepEqual(sent[1].payload.to, ['hussaintouhid@gmail.com']);
  assert.equal(sent[0].payload.from, 'SweetCrumb <onboarding@resend.dev>');
  assert.notEqual(sent[0].headers['Idempotency-Key'], sent[1].headers['Idempotency-Key']);
  assert.ok(!JSON.stringify(data).includes('fake-test-secret'));
});
test('rejects missing/invalid auth and other owners before any send', async () => {
  for (const options of [{ valid: false }, { owner: 'other' }, { hidden: true }]) {
    const { handler, sent } = setup(options);
    const response = await handler(request());
    assert.equal(response.status, options.valid === false ? 401 : 403);
    assert.equal(sent.length, 0);
  }
  const { handler } = setup();
  assert.equal((await handler(request(undefined, { headers: {} }))).status, 401);
});
test('rejects extra browser fields, malformed IDs and JSON', async () => {
  const { handler, sent } = setup();
  for (const body of [
    {},
    { order_id: 1 },
    { order_id: 'bad' },
    { order_id: id, customer_email: 'attacker@example.test' },
  ])
    assert.equal((await handler(request(body))).status, 400);
  assert.equal((await handler(request(undefined, { body: '{' }))).status, 400);
  assert.equal(sent.length, 0);
});
test('reports testing-sender rejection and still sends the admin notification', async () => {
  const { handler, sent } = setup({ responses: [403, 200] });
  const response = await handler(request());
  const data = await response.json();
  assert.equal(response.status, 207);
  assert.equal(data.success, false);
  assert.equal(data.customer_email_sent, false);
  assert.equal(data.admin_email_sent, true);
  assert.equal(data.customer_email.provider_status, 403);
  assert.match(data.customer_email.message, /testing sender/);
  assert.equal(sent.length, 2);
  assert.ok(!JSON.stringify(data).includes('provider-private-detail'));
});
test('reports admin failure independently and network ambiguity honestly', async () => {
  for (const responses of [
    [200, 429],
    [0, 0],
  ]) {
    const { handler } = setup({ responses });
    const response = await handler(request());
    const data = await response.json();
    assert.equal(data.admin_email_sent, false);
    assert.equal(response.status, responses[0] === 200 ? 207 : 502);
    if (responses[0] === 0) assert.equal(data.customer_email.status, 'unknown');
  }
});
test('allows the two CORS origins and rejects others without wildcard access', async () => {
  const { handler } = setup();
  for (const origin of ['http://localhost:4200', 'https://sweetcrumb-cupcakes.vercel.app']) {
    const response = await handler(
      request(undefined, { method: 'OPTIONS', body: undefined, headers: { origin } }),
    );
    assert.equal(response.status, 204);
    assert.equal(response.headers.get('Access-Control-Allow-Origin'), origin);
  }
  const response = await handler(
    request(undefined, { headers: { origin: 'https://evil.example' } }),
  );
  assert.equal(response.status, 403);
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), null);
  assert.equal((await handler(request(undefined, { method: 'GET', body: undefined }))).status, 405);
});
test('escapes all customer content and formats stored prices and pickup time', () => {
  const { html, text } = buildEmail(order, items, false);
  assert.ok(!html.includes('<script>'));
  assert.ok(!html.includes('<img src=x'));
  assert.match(html, /&lt;script&gt;/);
  assert.match(html, /Cake &amp; cream/);
  assert.match(html, /\$9\.00/);
  assert.match(text, /October 1, 2026 · 2:30 PM/);
  assert.ok(
    !buildEmail({ ...order, special_instructions: null }, items, false).html.includes(
      'Special Instructions',
    ),
  );
});
