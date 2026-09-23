import type { SupabaseClient } from 'npm:@supabase/supabase-js@2.116.0';

interface Dependencies {
  env(name: string): string | undefined;
  createClient(
    url: string,
    key: string,
    options: {
      global: { headers: { Authorization: string } };
      auth: { persistSession: false; autoRefreshToken: false; detectSessionInUrl: false };
    },
  ): SupabaseClient;
  fetch: typeof fetch;
}
interface Order {
  id: string;
  user_id: string;
  order_number: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  pickup_date: string | null;
  pickup_time: string | null;
  special_instructions: string | null;
  subtotal: number | string;
  status: string;
}
interface Item {
  product_name: string;
  quantity: number;
  unit_price: number | string;
  total: number | string;
}
interface Delivery {
  sent: boolean;
  status: 'accepted' | 'failed' | 'unknown';
  provider_status?: number;
  code?: string;
  message?: string;
}
const ORIGINS = new Set(['http://localhost:4200', 'https://sweetcrumb-cupcakes.vercel.app']);
const ADMIN = 'hussaintouhid@gmail.com';
const FROM = 'SweetCrumb <onboarding@resend.dev>';
const STATUSES: Record<string, string> = {
  received: 'Received',
  confirmed: 'Confirmed',
  preparing: 'Preparing',
  ready: 'Ready for Pickup',
  completed: 'Completed',
  cancelled: 'Cancelled',
};
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function escapeHtml(value: unknown): string {
  return String(value ?? '').replace(
    /[&<>"']/g,
    (character) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      })[character]!,
  );
}
function money(value: number | string): string {
  if (value === '' || !Number.isFinite(Number(value)) || Number(value) < 0)
    throw new Error('Invalid stored amount');
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(
    Number(value),
  );
}
function pickup(order: Order): string {
  let date = order.pickup_date || 'Not specified';
  if (order.pickup_date && /^\d{4}-\d{2}-\d{2}$/.test(order.pickup_date)) {
    const parsed = new Date(`${order.pickup_date}T12:00:00Z`);
    if (!Number.isNaN(parsed.getTime()))
      date = new Intl.DateTimeFormat('en-US', { dateStyle: 'long', timeZone: 'UTC' }).format(
        parsed,
      );
  }
  let time = order.pickup_time || 'Not specified';
  if (order.pickup_time && /^\d{2}:\d{2}/.test(order.pickup_time)) {
    const [hour, minute] = order.pickup_time.split(':');
    time = `${Number(hour) % 12 || 12}:${minute} ${Number(hour) >= 12 ? 'PM' : 'AM'}`;
  }
  return `${date} · ${time}`;
}
export function buildEmail(order: Order, items: Item[], admin: boolean) {
  const status = Object.hasOwn(STATUSES, order.status) ? STATUSES[order.status] : order.status;
  const title = admin ? 'New order received' : 'Your order is in!';
  const greeting = admin ? `Customer: ${order.customer_name}` : `Hi ${order.customer_name},`;
  const itemText = items
    .map(
      (item) =>
        `${item.product_name} — ${item.quantity} × ${money(item.unit_price)} — ${money(item.total)}`,
    )
    .join('\n');
  const details: Array<[string, string]> = [
    ['Order Number', order.order_number],
    ['Status', status],
    ['Pickup', pickup(order)],
  ];
  if (admin) {
    details.push(['Customer Name', order.customer_name], ['Customer Email', order.customer_email]);
    if (order.customer_phone) details.push(['Customer Phone', order.customer_phone]);
  }
  const instructions = order.special_instructions?.trim();
  const text = [
    'SweetCrumb — BAKED WITH LOVE',
    title,
    greeting,
    "We've received your SweetCrumb order.",
    ...details.map(([label, value]) => `${label}: ${value}`),
    itemText,
    `Order Total: ${money(order.subtotal)}`,
    ...(instructions ? [`Special Instructions: ${instructions}`] : []),
    "Thank you for choosing SweetCrumb. We'll have something sweet waiting for you.",
    'SweetCrumb — Demo Bakery',
  ].join('\n\n');
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;background:#fffaf5;color:#3b2924;font-family:Arial,sans-serif"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center" style="padding:28px 12px">
<table role="presentation" width="600" cellspacing="0" cellpadding="0" style="width:100%;max-width:600px;background:#fffdfa;border:1px solid #e8dcd1;border-radius:16px"><tr><td style="padding:32px">
<div style="font:34px Georgia,serif">SweetCrumb</div><p style="font-size:10px;letter-spacing:3px;color:#874857">BAKED WITH LOVE</p>
<h1 style="font:36px Georgia,serif;color:#874857">${title}</h1><p>${escapeHtml(greeting)}</p><p style="line-height:1.7">We've received your SweetCrumb order.</p>
${details.map(([label, value]) => `<p style="line-height:1.6"><strong>${label}</strong><br>${escapeHtml(value)}</p>`).join('')}
<table width="100%" cellspacing="0" cellpadding="8" style="border-collapse:collapse;font-size:13px"><caption style="text-align:left;font:22px Georgia,serif;padding:18px 0">Your treats</caption><thead><tr style="background:#f2e5df"><th scope="col" align="left">Treat</th><th scope="col">Qty</th><th scope="col" align="right">Unit price</th><th scope="col" align="right">Total</th></tr></thead><tbody>
${items.map((item) => `<tr><td style="border-bottom:1px solid #e8dcd1">${escapeHtml(item.product_name)}</td><td align="center">${escapeHtml(item.quantity)}</td><td align="right">${money(item.unit_price)}</td><td align="right">${money(item.total)}</td></tr>`).join('')}
</tbody></table><p style="font-size:20px;padding:18px 0"><strong>Order Total: ${money(order.subtotal)}</strong></p>
${instructions ? `<h2 style="font:22px Georgia,serif">Special Instructions</h2><p style="white-space:pre-wrap;line-height:1.7">${escapeHtml(instructions)}</p>` : ''}
<p style="line-height:1.8">Thank you for choosing SweetCrumb.<br>We'll have something sweet waiting for you.</p><p style="border-top:1px solid #e8dcd1;padding-top:20px;font-size:11px;color:#78685e">SweetCrumb — Demo Bakery</p>
</td></tr></table></td></tr></table></body></html>`;
  return {
    from: FROM,
    to: [admin ? ADMIN : order.customer_email],
    subject: `${admin ? 'New SweetCrumb Order' : 'SweetCrumb Order Received'} — ${order.order_number.replace(/[\r\n]/g, '')}`,
    html,
    text,
  };
}

async function deliver(
  deps: Dependencies,
  key: string,
  order: Order,
  items: Item[],
  admin: boolean,
): Promise<Delivery> {
  try {
    const response = await deps.fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': `sweetcrumb-order-${order.id}-${admin ? 'admin' : 'customer'}-v1`,
      },
      body: JSON.stringify(buildEmail(order, items, admin)),
      signal: AbortSignal.timeout(15000),
    });
    const data: unknown = await response.json().catch(() => null);
    if (
      response.ok &&
      data &&
      typeof data === 'object' &&
      'id' in data &&
      typeof data.id === 'string' &&
      data.id.length > 0
    )
      return { sent: true, status: 'accepted', provider_status: response.status };
    // Do not echo provider messages: they can contain recipient data or configuration details.
    if (response.ok)
      return {
        sent: false,
        status: 'unknown',
        provider_status: response.status,
        code: 'invalid_provider_response',
        message: 'Resend returned an unrecognized response; acceptance could not be confirmed.',
      };
    return {
      sent: false,
      status: response.status >= 500 ? 'unknown' : 'failed',
      provider_status: response.status,
      code:
        response.status === 403
          ? 'recipient_or_sender_restricted'
          : response.status === 429
            ? 'rate_limited'
            : response.status === 409
              ? 'idempotency_conflict'
              : 'resend_rejected',
      message:
        response.status === 403
          ? 'Resend rejected this sender or recipient. The testing sender may only send to permitted recipients until a sending domain is verified.'
          : 'Resend did not confirm this email. Inspect the provider status before retrying.',
    };
  } catch {
    return {
      sent: false,
      status: 'unknown',
      code: 'delivery_unconfirmed',
      message: 'Email acceptance could not be confirmed due to a network error or timeout.',
    };
  }
}

export function createHandler(deps: Dependencies) {
  return async (request: Request): Promise<Response> => {
    const origin = request.headers.get('origin');
    const headers = new Headers({
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      Vary: 'Origin',
    });
    if (origin && ORIGINS.has(origin)) {
      headers.set('Access-Control-Allow-Origin', origin);
      headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
      headers.set(
        'Access-Control-Allow-Headers',
        'authorization, apikey, content-type, x-client-info',
      );
      headers.set('Access-Control-Max-Age', '600');
    }
    const json = (status: number, body: unknown) =>
      new Response(JSON.stringify(body), { status, headers });
    if (origin && !ORIGINS.has(origin))
      return json(403, { success: false, error: 'Origin not allowed.' });
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    if (request.method !== 'POST') {
      headers.set('Allow', 'POST, OPTIONS');
      return json(405, { success: false, error: 'Use POST.' });
    }
    const authorization = request.headers.get('authorization');
    const bearer = authorization?.match(/^Bearer\s+(\S+)$/i);
    if (!bearer) return json(401, { success: false, error: 'Authentication required.' });
    if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json'))
      return json(415, { success: false, error: 'Send application/json.' });
    let body: unknown;
    try {
      const raw = await request.text();
      if (raw.length > 1024) return json(413, { success: false, error: 'Request too large.' });
      body = JSON.parse(raw);
    } catch {
      return json(400, { success: false, error: 'Invalid JSON.' });
    }
    if (
      !body ||
      typeof body !== 'object' ||
      Array.isArray(body) ||
      Object.keys(body).length !== 1 ||
      !('order_id' in body) ||
      typeof body.order_id !== 'string' ||
      !UUID.test(body.order_id)
    )
      return json(400, { success: false, error: 'Provide only order_id as a UUID string.' });
    try {
      const url = deps.env('SUPABASE_URL');
      // SUPABASE_ANON_KEY is the standard hosted public key. No privileged client is used.
      const publicKey = deps.env('SUPABASE_ANON_KEY') || deps.env('SUPABASE_PUBLISHABLE_KEY');
      const resendKey = deps.env('RESEND_API_KEY');
      if (!url || !publicKey || !resendKey)
        return json(500, { success: false, error: 'Email service is not configured.' });
      const client = deps.createClient(url, publicKey, {
        global: { headers: { Authorization: `Bearer ${bearer[1]}` } },
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      });
      const { data: userData, error: authError } = await client.auth.getUser(bearer[1]);
      if (authError || !userData.user)
        return json(401, { success: false, error: 'Invalid or expired session.' });
      const { data: order, error: orderError } = await client
        .from('orders')
        .select(
          'id, user_id, order_number, customer_name, customer_email, customer_phone, pickup_date, pickup_time, special_instructions, subtotal, status',
        )
        .eq('id', body.order_id)
        .maybeSingle<Order>();
      if (orderError) return json(502, { success: false, error: 'Could not load the order.' });
      // RLS hides other customers' rows; do not disclose whether a hidden order exists.
      if (!order || order.user_id !== userData.user.id)
        return json(403, { success: false, error: 'Order unavailable or access denied.' });
      const items: Item[] = [];
      for (let offset = 0; ; offset += 1000) {
        const { data, error } = await client
          .from('order_items')
          .select('product_name, quantity, unit_price, total')
          .eq('order_id', order.id)
          .order('id')
          .range(offset, offset + 999)
          .returns<Item[]>();
        if (error || !data)
          return json(502, { success: false, error: 'Could not load order items.' });
        items.push(...data);
        if (data.length < 1000) break;
      }
      if (!items.length)
        return json(409, { success: false, error: 'Order item details are not available.' });
      // Validate/render before either send, so invalid stored values cannot produce a partial render.
      buildEmail(order, items, false);
      buildEmail(order, items, true);
      const customer = await deliver(deps, resendKey, order, items, false);
      const admin = await deliver(deps, resendKey, order, items, true);
      const success = customer.sent && admin.sent;
      return json(success ? 200 : customer.sent || admin.sent ? 207 : 502, {
        success,
        customer_email_sent: customer.sent,
        admin_email_sent: admin.sent,
        customer_email: customer,
        admin_email: admin,
      });
    } catch {
      return json(500, {
        success: false,
        error: 'Email service could not complete the request. The order has not been changed.',
      });
    }
  };
}
