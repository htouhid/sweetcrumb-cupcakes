/** In-memory notification state only; this never changes order placement state. */
export interface OrderEmailStatus {
  state: 'pending' | 'sent' | 'partial' | 'failed' | 'unknown';
  customerEmailSent: boolean | null;
  adminEmailSent: boolean | null;
}

export function parseOrderEmailStatus(body: unknown, requestFailed = false): OrderEmailStatus {
  const unknown: OrderEmailStatus = {
    state: 'unknown',
    customerEmailSent: null,
    adminEmailSent: null,
  };
  if (!body || typeof body !== 'object') return unknown;
  const row = body as Record<string, unknown>;
  const customer =
    typeof row['customer_email_sent'] === 'boolean' ? row['customer_email_sent'] : null;
  const admin = typeof row['admin_email_sent'] === 'boolean' ? row['admin_email_sent'] : null;
  const unconfirmed = ['customer_email', 'admin_email'].some((key) => {
    const delivery = row[key];
    return (
      !!delivery &&
      typeof delivery === 'object' &&
      'status' in delivery &&
      delivery.status === 'unknown'
    );
  });
  return {
    state:
      customer === null || admin === null || unconfirmed || (requestFailed && customer && admin)
        ? 'unknown'
        : customer && admin
          ? 'sent'
          : customer || admin
            ? 'partial'
            : 'failed',
    customerEmailSent: customer,
    adminEmailSent: admin,
  };
}
