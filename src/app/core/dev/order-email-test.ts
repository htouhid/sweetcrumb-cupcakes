import { isDevMode } from '@angular/core';
import type { OrderEmailStatus } from '../models/order-email';

declare global {
  interface Window {
    sweetCrumbEmailTest?: (orderId: string) => Promise<OrderEmailStatus>;
  }
}

/** Temporary console entrypoint imported only by the development bootstrap. */
export function installOrderEmailTest(
  target: Window,
  send: (orderId: string) => Promise<OrderEmailStatus>,
): () => void {
  if (!isDevMode() || target.location.origin !== 'http://localhost:4200') return () => {};
  let pending = false;
  const invoke = async (orderId: string) => {
    if (pending) throw new Error('An email test is already running. Please wait.');
    if (
      typeof orderId !== 'string' ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderId)
    ) {
      throw new Error('Provide the full existing order UUID.');
    }
    pending = true;
    try {
      return await send(orderId);
    } finally {
      pending = false;
    }
  };
  Object.defineProperty(target, 'sweetCrumbEmailTest', { value: invoke, configurable: true });
  return () => {
    if (target.sweetCrumbEmailTest === invoke) delete target.sweetCrumbEmailTest;
  };
}
