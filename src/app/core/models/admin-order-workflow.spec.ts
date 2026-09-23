import { nextOrderAction } from './admin-order-workflow';

describe('bakery workflow actions', () => {
  it('offers only the next forward action for each active status', () => {
    expect(nextOrderAction('received')).toMatchObject({
      label: 'Confirm Order',
      target: 'confirmed',
    });
    expect(nextOrderAction('confirmed')).toMatchObject({
      label: 'Start Preparing',
      target: 'preparing',
    });
    expect(nextOrderAction('preparing')).toMatchObject({
      label: 'Mark Ready for Pickup',
      target: 'ready',
    });
    expect(nextOrderAction('ready')).toMatchObject({
      label: 'Complete Order',
      target: 'completed',
    });
  });
  it('offers no action for completed or cancelled orders', () => {
    expect(nextOrderAction('completed')).toBeNull();
    expect(nextOrderAction('cancelled')).toBeNull();
  });
});
