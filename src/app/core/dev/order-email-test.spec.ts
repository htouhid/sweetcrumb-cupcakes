import { vi } from 'vitest';
import { installOrderEmailTest } from './order-email-test';

describe('temporary localhost email console helper', () => {
  function browser(origin = 'http://localhost:4200') {
    return { location: { origin } } as Window;
  }
  it('invokes the supplied authenticated service without Angular globals and cleans up', async () => {
    const target = browser();
    const result = { state: 'sent', customerEmailSent: true, adminEmailSent: true } as const;
    const send = vi.fn().mockResolvedValue(result);
    const cleanup = installOrderEmailTest(target, send);
    const id = '11111111-1111-4111-8111-111111111111';
    expect(await target.sweetCrumbEmailTest!(id)).toEqual(result);
    expect(send).toHaveBeenCalledExactlyOnceWith(id);
    cleanup();
    expect(target.sweetCrumbEmailTest).toBeUndefined();
  });
  it('does not install on other origins', () => {
    for (const origin of [
      'https://sweetcrumb-cupcakes.vercel.app',
      'http://127.0.0.1:4200',
      'http://localhost:4300',
    ]) {
      const target = browser(origin);
      installOrderEmailTest(target, vi.fn());
      expect(target.sweetCrumbEmailTest).toBeUndefined();
    }
  });
  it('rejects invalid IDs and overlapping sends, then permits another invocation', async () => {
    const target = browser();
    let finish!: () => void;
    const send = vi.fn().mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    installOrderEmailTest(target, send);
    await expect(target.sweetCrumbEmailTest!('SC-NUMBER')).rejects.toThrow('UUID');
    expect(send).not.toHaveBeenCalled();
    const id = '11111111-1111-4111-8111-111111111111';
    const first = target.sweetCrumbEmailTest!(id);
    await expect(target.sweetCrumbEmailTest!(id)).rejects.toThrow('already running');
    finish();
    await first;
    send.mockRejectedValueOnce(new Error('Order not owned'));
    await expect(target.sweetCrumbEmailTest!(id)).rejects.toThrow('Order not owned');
    expect(send).toHaveBeenCalledTimes(2);
  });
});
