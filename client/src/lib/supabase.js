import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
if (!url || !key) throw new Error('Missing VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY');

export const supabase = createClient(url, key, {
  auth: { persistSession: true, autoRefreshToken: true, storageKey: 'cls-shop-auth' },
});

/** Usernames map to a hidden email so people only ever type their username. */
export const USER_EMAIL_DOMAIN = 'shop.coryslawnservice.com';
export const usernameToEmail = (u) => `${u.trim().toLowerCase()}@${USER_EMAIL_DOMAIN}`;

export const BUCKET = 'attachments';
/** Supabase free plan caps each upload at 50 MB. Raise this if the plan is upgraded. */
export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

/** Throw on Supabase errors so callers can just await. */
export async function q(promise) {
  const { data, error } = await promise;
  if (error) throw new Error(friendlyError(error));
  return data;
}

export function friendlyError(error) {
  const m = error?.message || String(error);
  if (/Invalid login credentials/i.test(m)) return 'Wrong username or password.';
  if (/row-level security|permission denied|42501/i.test(m)) return "You don't have permission to do that.";
  if (/exceeded the maximum allowed size|Payload too large/i.test(m)) return 'That file is too big (50 MB max).';
  if (/duplicate key.*asset_number/i.test(m)) return 'That equipment number is already in use.';
  if (/Failed to fetch|NetworkError/i.test(m)) return 'No connection. Check your signal and try again.';
  return m;
}
