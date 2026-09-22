import { Injectable } from '@angular/core';
import { createClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class SupabaseService {
  // Supabase owns session persistence, token refresh, and confirmation-link handling.
  readonly client = createClient(environment.supabaseUrl, environment.supabaseKey);
}
