import { createClient } from 'npm:@supabase/supabase-js@2.116.0';
import { createHandler } from './handler.ts';

Deno.serve(
  createHandler({
    env: (name) => Deno.env.get(name),
    createClient,
    fetch: (input, init) => fetch(input, init),
  }),
);
