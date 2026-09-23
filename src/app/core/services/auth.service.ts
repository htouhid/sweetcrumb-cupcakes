import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { Session, User } from '@supabase/supabase-js';
import { Profile } from '../models/profile';
import { SupabaseService } from './supabase.service';

export function authErrorMessage(error: unknown): string {
  const code =
    typeof error === 'object' && error !== null && 'code' in error ? error.code : undefined;
  switch (code) {
    case 'invalid_credentials':
      return 'That email and password don’t match. Please try again.';
    case 'email_not_confirmed':
      return 'Please confirm your email before signing in. Look for a message from SweetCrumb in your inbox.';
    case 'user_already_exists':
    case 'email_exists':
      return 'An account with this email may already exist. Please try signing in.';
    case 'weak_password':
      return 'Please choose a stronger password with at least 8 characters.';
    case 'over_email_send_rate_limit':
    case 'over_request_rate_limit':
      return 'A few too many attempts. Please wait a moment and try again.';
    case 'signup_disabled':
      return 'New accounts are temporarily unavailable. Please try again later.';
    default:
      return 'We couldn’t complete that request. Please check your connection and try again.';
  }
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly client = inject(SupabaseService).client;
  private readonly userState = signal<User | null>(null);
  private readonly profileState = signal<Profile | null>(null);
  private readonly initializing = signal(true);
  private readonly pending = signal(0);
  readonly currentUser = this.userState.asReadonly();
  readonly profile = this.profileState.asReadonly();
  readonly authLoading = computed(() => this.initializing() || this.pending() > 0);
  readonly isAuthenticated = computed(() => this.currentUser() !== null);
  readonly isAdmin = computed(() => this.profile()?.role === 'admin');
  readonly firstName = computed(() => this.profile()?.first_name?.trim() || 'there');
  readonly profileLoading = signal(false);
  readonly profileError = signal<string | null>(null);
  readonly initializationError = signal<string | null>(null);
  private revision = 0;
  private profileTask: Promise<void> = Promise.resolve();
  private initialization?: Promise<void>;

  constructor() {
    const {
      data: { subscription },
    } = this.client.auth.onAuthStateChange((_event, session) => {
      // Keep this callback synchronous: Supabase calls it while holding its auth lock.
      this.acceptSession(session);
    });
    inject(DestroyRef).onDestroy(() => {
      subscription.unsubscribe();
      this.revision++;
    });
  }

  initialize(): Promise<void> {
    return (this.initialization ??= this.restoreSession());
  }

  /** Wait for the latest profile request, including auth events during initialization. */
  async whenProfileReady(): Promise<void> {
    let task: Promise<void>;
    do {
      task = this.profileTask;
      await task;
    } while (task !== this.profileTask);
  }

  private async restoreSession(): Promise<void> {
    const revision = this.revision;
    try {
      const { data, error } = await this.client.auth.getSession();
      if (error) throw error;
      // A newer auth event wins over a potentially stale restoration response.
      if (revision === this.revision) this.acceptSession(data.session);
      await this.profileTask;
    } catch {
      this.initializationError.set('We couldn’t restore your session. Please sign in again.');
    } finally {
      this.initializing.set(false);
    }
  }

  private acceptSession(session: Session | null): void {
    const revision = ++this.revision;
    const previousId = this.currentUser()?.id;
    this.userState.set(session?.user ?? null);
    if (previousId !== session?.user.id || !session) this.profileState.set(null);
    this.profileError.set(null);
    this.profileLoading.set(!!session);
    if (!session) {
      this.profileTask = Promise.resolve();
      return;
    }
    this.initializationError.set(null);
    // Run database work after the auth callback has returned and released its lock.
    this.profileTask = new Promise<void>((resolve) => {
      setTimeout(() => {
        if (revision !== this.revision) {
          resolve();
          return;
        }
        void this.fetchProfile(session.user.id, revision).finally(resolve);
      }, 0);
    });
  }

  async loadProfile(): Promise<void> {
    const id = this.currentUser()?.id;
    if (!id) return;
    const revision = ++this.revision;
    this.profileLoading.set(true);
    this.profileError.set(null);
    this.profileTask = this.fetchProfile(id, revision);
    await this.profileTask;
  }

  private async fetchProfile(id: string, revision: number): Promise<void> {
    try {
      const { data, error } = await this.client
        .from('profiles')
        .select('id, first_name, last_name, role, created_at, updated_at')
        .eq('id', id)
        .maybeSingle<Profile>();
      if (error || !data || data.id !== id || !['customer', 'admin'].includes(data.role))
        throw new Error('Profile unavailable');
      if (revision === this.revision && this.currentUser()?.id === id) this.profileState.set(data);
    } catch {
      if (revision === this.revision) {
        this.profileState.set(null);
        this.profileError.set('Your account details couldn’t be loaded. Please try again.');
      }
    } finally {
      if (revision === this.revision) this.profileLoading.set(false);
    }
  }

  async signUp(
    firstName: string,
    lastName: string,
    email: string,
    password: string,
  ): Promise<{ needsConfirmation: boolean }> {
    await this.initialize();
    this.pending.update((value) => value + 1);
    try {
      const { data, error } = await this.client.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { first_name: firstName.trim(), last_name: lastName.trim() } },
      });
      if (error) throw error;
      if (data.session) {
        this.acceptSession(data.session);
        await this.profileTask;
      }
      return { needsConfirmation: !data.session };
    } finally {
      this.pending.update((value) => value - 1);
    }
  }

  async signIn(email: string, password: string): Promise<void> {
    await this.initialize();
    this.pending.update((value) => value + 1);
    try {
      const { data, error } = await this.client.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) throw error;
      this.acceptSession(data.session);
      await this.profileTask;
    } finally {
      this.pending.update((value) => value - 1);
    }
  }

  async signOut(): Promise<void> {
    await this.initialize();
    this.pending.update((value) => value + 1);
    try {
      const { error } = await this.client.auth.signOut();
      if (error) throw error;
      this.acceptSession(null);
    } finally {
      this.pending.update((value) => value - 1);
    }
  }
}
