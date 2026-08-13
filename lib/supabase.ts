'use client';
import { createBrowserClient } from '@supabase/ssr';

const url  = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// createBrowserClient stores the session in cookies so the middleware
// can read the auth-token on every server-side request.
export const supabase = url && anon
  ? createBrowserClient(url, anon)
  : null;

export const USING_MOCK = !supabase;
