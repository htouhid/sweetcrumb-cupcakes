export type OrderStatus =
  'received' | 'confirmed' | 'preparing' | 'ready' | 'completed' | 'cancelled';
export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  received: 'Received',
  confirmed: 'Confirmed',
  preparing: 'Preparing',
  ready: 'Ready for Pickup',
  completed: 'Completed',
  cancelled: 'Cancelled',
};
export function isActiveOrder(order: Pick<Order, 'status'>): boolean {
  return ['received', 'confirmed', 'preparing', 'ready'].includes(order.status);
}
export interface Order {
  id: string;
  order_number: string;
  user_id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  pickup_date: string | null;
  pickup_time: string | null;
  special_instructions: string | null;
  subtotal: number;
  status: OrderStatus;
  created_at: string;
  updated_at: string;
}
export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string | null;
  product_name: string;
  quantity: number;
  unit_price: number;
  total: number;
  created_at: string;
}
export interface PlaceOrderRequest {
  items: ReadonlyArray<{ product_id: string; quantity: number }>;
  customer_name: string;
  customer_phone?: string | null;
  pickup_date: string;
  pickup_time: string;
  special_instructions?: string | null;
}
export interface PlaceOrderResult {
  order_id: string;
  order_number: string;
  subtotal: number;
  status: OrderStatus;
}
export function orderAmount(value: unknown): number {
  if (
    (typeof value !== 'number' && typeof value !== 'string') ||
    value === '' ||
    !Number.isFinite(Number(value)) ||
    Number(value) < 0
  )
    throw new Error('Invalid order amount');
  return Number(value);
}
export function pickupTimeLabel(time: string | null): string {
  if (!time) return 'Not specified';
  const [hour, minute] = time.split(':');
  return `${Number(hour) % 12 || 12}:${minute} ${Number(hour) >= 12 ? 'PM' : 'AM'}`;
}

/** Parse date-only pickup values in local time so their calendar day never shifts. */
export function orderDateLabel(value: string | null): string {
  if (!value) return 'Not specified';
  const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00` : value);
  return Number.isNaN(date.getTime())
    ? 'Not specified'
    : new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(
        date,
      );
}
