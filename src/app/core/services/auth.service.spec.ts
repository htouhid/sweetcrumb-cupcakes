import { TestBed } from '@angular/core/testing';
import { Session } from '@supabase/supabase-js';
import { vi } from 'vitest';
import { AuthService, authErrorMessage } from './auth.service';
import { SupabaseService } from './supabase.service';

const session = {
  user: { id: 'customer-id', email: 'customer@example.test', user_metadata: { role: 'admin' } },
} as unknown as Session;
const profile = {
  id: 'customer-id',
  first_name: 'Avery',
  last_name: 'Baker',
  role: 'customer',
  created_at: '',
  updated_at: '',
};
const pause = () => new Promise((resolve) => setTimeout(resolve, 5));
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

describe('AuthService', () => {
  let callback: (event: string, session: Session | null) => void;
  let query: {
    select: ReturnType<typeof vi.fn>;
    eq: ReturnType<typeof vi.fn>;
    maybeSingle: ReturnType<typeof vi.fn>;
  };
  let client: {
    auth: {
      onAuthStateChange: ReturnType<typeof vi.fn>;
      getSession: ReturnType<typeof vi.fn>;
      signUp: ReturnType<typeof vi.fn>;
      signInWithPassword: ReturnType<typeof vi.fn>;
      signOut: ReturnType<typeof vi.fn>;
    };
    from: ReturnType<typeof vi.fn>;
  };
  const unsubscribe = vi.fn();
  beforeEach(() => {
    query = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: profile, error: null }),
    };
    client = {
      auth: {
        onAuthStateChange: vi.fn((fn) => {
          callback = fn;
          return { data: { subscription: { unsubscribe } } };
        }),
        getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
        signUp: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
        signInWithPassword: vi.fn().mockResolvedValue({ data: { session }, error: null }),
        signOut: vi.fn().mockResolvedValue({ error: null }),
      },
      from: vi.fn().mockReturnValue(query),
    };
    TestBed.configureTestingModule({
      providers: [{ provide: SupabaseService, useValue: { client } }],
    });
  });
  afterEach(() => TestBed.resetTestingModule());

  it('restores a session once, loads its profile, and trusts only the database role', async () => {
    client.auth.getSession.mockResolvedValue({ data: { session }, error: null });
    const auth = TestBed.inject(AuthService);
    expect(auth.authLoading()).toBe(true);
    await Promise.all([auth.initialize(), auth.initialize()]);
    expect(client.auth.getSession).toHaveBeenCalledTimes(1);
    expect(auth.isAuthenticated()).toBe(true);
    expect(auth.firstName()).toBe('Avery');
    expect(auth.isAdmin()).toBe(false);
    expect(client.from).toHaveBeenCalledWith('profiles');
    expect(query.eq).toHaveBeenCalledWith('id', session.user.id);
    expect(auth.authLoading()).toBe(false);
    query.maybeSingle.mockResolvedValue({ data: { ...profile, role: 'admin' }, error: null });
    await auth.loadProfile();
    expect(auth.isAdmin()).toBe(true);
  });

  it('sends names as signup metadata and handles confirmation without a session', async () => {
    const auth = TestBed.inject(AuthService);
    const result = await auth.signUp(
      ' Avery ',
      ' Baker ',
      ' customer@example.test ',
      'test-password',
    );
    expect(client.auth.signUp).toHaveBeenCalledWith({
      email: 'customer@example.test',
      password: 'test-password',
      options: { data: { first_name: 'Avery', last_name: 'Baker' } },
    });
    expect(result.needsConfirmation).toBe(true);
    expect(auth.isAuthenticated()).toBe(false);
    expect(client.from).not.toHaveBeenCalled();
  });

  it('supports immediate sessions from signup and email/password sign-in', async () => {
    client.auth.signUp.mockResolvedValue({ data: { session }, error: null });
    const auth = TestBed.inject(AuthService);
    expect(
      (await auth.signUp('Avery', 'Baker', 'customer@example.test', 'test-password'))
        .needsConfirmation,
    ).toBe(false);
    expect(auth.profile()?.first_name).toBe('Avery');
    await auth.signOut();
    expect(auth.currentUser()).toBeNull();
    expect(auth.profile()).toBeNull();
    await auth.signIn('customer@example.test', 'test-password');
    expect(auth.isAuthenticated()).toBe(true);
    expect(client.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'customer@example.test',
      password: 'test-password',
    });
  });

  it('does not let a stale restoration replace a newer auth event', async () => {
    const restoration = deferred<{ data: { session: Session | null }; error: null }>();
    client.auth.getSession.mockReturnValue(restoration.promise);
    const auth = TestBed.inject(AuthService);
    const ready = auth.initialize();
    callback('SIGNED_IN', session);
    restoration.resolve({ data: { session: null }, error: null });
    await ready;
    expect(auth.currentUser()?.id).toBe('customer-id');
  });

  it('keeps callbacks synchronous and discards a profile response after logout', async () => {
    const auth = TestBed.inject(AuthService);
    await auth.initialize();
    const response = deferred<{ data: typeof profile; error: null }>();
    query.maybeSingle.mockReturnValue(response.promise);
    expect(callback('SIGNED_IN', session)).toBeUndefined();
    expect(client.from).not.toHaveBeenCalled();
    await pause();
    await auth.signOut();
    response.resolve({ data: profile, error: null });
    await pause();
    expect(auth.profile()).toBeNull();
    expect(auth.currentUser()).toBeNull();
    expect(auth.isAdmin()).toBe(false);
  });

  it('handles missing profiles without logging out and permits retry', async () => {
    client.auth.getSession.mockResolvedValue({ data: { session }, error: null });
    query.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
    const auth = TestBed.inject(AuthService);
    await auth.initialize();
    expect(auth.isAuthenticated()).toBe(true);
    expect(auth.profileError()).toBeTruthy();
    expect(auth.isAdmin()).toBe(false);
    await auth.loadProfile();
    expect(auth.profileError()).toBeNull();
    expect(auth.firstName()).toBe('Avery');
  });

  it('settles initialization errors and releases loading after failed sign-in', async () => {
    client.auth.getSession.mockRejectedValue(new Error('network'));
    const auth = TestBed.inject(AuthService);
    await auth.initialize();
    expect(auth.authLoading()).toBe(false);
    expect(auth.initializationError()).toBeTruthy();
    client.auth.signInWithPassword.mockResolvedValue({
      data: { session: null },
      error: { code: 'invalid_credentials' },
    });
    await expect(auth.signIn('customer@example.test', 'wrong')).rejects.toEqual({
      code: 'invalid_credentials',
    });
    expect(auth.authLoading()).toBe(false);
    expect(auth.isAuthenticated()).toBe(false);
  });

  it('retains a session if sign-out fails and hides raw server errors', async () => {
    client.auth.getSession.mockResolvedValue({ data: { session }, error: null });
    const auth = TestBed.inject(AuthService);
    await auth.initialize();
    client.auth.signOut.mockResolvedValue({ error: { code: 'network_error' } });
    await expect(auth.signOut()).rejects.toEqual({ code: 'network_error' });
    expect(auth.isAuthenticated()).toBe(true);
    expect(auth.authLoading()).toBe(false);
    expect(authErrorMessage(new Error('internal detail'))).not.toContain('internal detail');
  });
});
