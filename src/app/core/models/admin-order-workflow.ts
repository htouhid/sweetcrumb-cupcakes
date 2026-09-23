import { OrderStatus } from './order';

export type NextOrderStatus = 'confirmed' | 'preparing' | 'ready' | 'completed';
export interface OrderWorkflowAction {
  target: NextOrderStatus;
  label: string;
  confirmation: string;
}
const ACTIONS: Partial<Record<OrderStatus, OrderWorkflowAction>> = {
  received: {
    target: 'confirmed',
    label: 'Confirm Order',
    confirmation: 'Confirm this SweetCrumb order?',
  },
  confirmed: {
    target: 'preparing',
    label: 'Start Preparing',
    confirmation: 'Start preparing this order?',
  },
  preparing: {
    target: 'ready',
    label: 'Mark Ready for Pickup',
    confirmation: 'Mark this order as ready for pickup?',
  },
  ready: {
    target: 'completed',
    label: 'Complete Order',
    confirmation: 'Mark this order as completed?',
  },
};
export function nextOrderAction(status: OrderStatus): OrderWorkflowAction | null {
  return ACTIONS[status] ?? null;
}
export interface UpdateOrderStatusResult {
  order_id: string;
  order_number: string;
  previous_status: OrderStatus;
  status: NextOrderStatus;
  updated_at: string;
}
