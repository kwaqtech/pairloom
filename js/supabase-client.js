import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const AUTH_REQUEST_TIMEOUT_MS = 12_000;

function fetchWithAuthTimeout(input, init = {}) {
  const requestUrl = input instanceof Request ? input.url : String(input);
  if (!new URL(requestUrl, url).pathname.includes('/auth/v1/')) return fetch(input, init);

  const controller = new AbortController();
  const signal = init.signal || (input instanceof Request ? input.signal : null);
  const abort = () => controller.abort(signal.reason);
  if (signal?.aborted) abort();
  else signal?.addEventListener('abort', abort, { once: true });

  const timeout = window.setTimeout(() => controller.abort(), AUTH_REQUEST_TIMEOUT_MS);
  return fetch(input, { ...init, signal: controller.signal }).finally(() => {
    window.clearTimeout(timeout);
    signal?.removeEventListener('abort', abort);
  });
}

export const supabase = url && publishableKey
  ? createClient(url, publishableKey, {
    global: { fetch: fetchWithAuthTimeout },
    auth: {
      flowType: 'pkce',
      persistSession: true,
      storage: window.sessionStorage,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  })
  : null;
