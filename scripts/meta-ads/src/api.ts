import { BASE_URL } from './config.js';
import { logError, logWarn } from './utils.js';

const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 2000;

interface MetaApiError {
  error: {
    message: string;
    type: string;
    code: number;
    error_subcode?: number;
    fbtrace_id?: string;
  };
}

function isRateLimited(code: number): boolean {
  // Error codes 4 and 17 indicate rate limiting
  return code === 4 || code === 17;
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Make a request to the Meta Marketing API with automatic retry on rate limits.
 */
export async function metaFetch<T = Record<string, unknown>>(
  path: string,
  token: string,
  options: {
    method?: 'GET' | 'POST' | 'DELETE';
    params?: Record<string, string | number | boolean | object>;
    body?: Record<string, unknown>;
  } = {}
): Promise<T> {
  const { method = 'GET', params, body } = options;
  let url: string;

  if (path.startsWith('http')) {
    url = path;
  } else {
    url = `${BASE_URL}/${path.replace(/^\//, '')}`;
  }

  const urlObj = new URL(url);
  urlObj.searchParams.set('access_token', token);

  // Append GET params
  if (params && method === 'GET') {
    for (const [key, val] of Object.entries(params)) {
      urlObj.searchParams.set(
        key,
        typeof val === 'object' ? JSON.stringify(val) : String(val)
      );
    }
  }

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const fetchOptions: RequestInit = { method };

    if (method === 'POST') {
      // For POST, send everything as form-urlencoded
      // (Meta API accepts both JSON and form-encoded, but form-encoded is more reliable for nested objects)
      const formBody = new URLSearchParams();
      const allParams = { ...(params ?? {}), ...(body ?? {}) };
      for (const [key, val] of Object.entries(allParams)) {
        formBody.set(
          key,
          typeof val === 'object' ? JSON.stringify(val) : String(val)
        );
      }
      fetchOptions.body = formBody;
      fetchOptions.headers = {
        'Content-Type': 'application/x-www-form-urlencoded',
      };
    }

    const res = await fetch(urlObj.toString(), fetchOptions);
    const json = (await res.json()) as T | MetaApiError;

    if (res.ok) {
      return json as T;
    }

    const err = json as MetaApiError;
    const code = err.error?.code ?? 0;

    if (isRateLimited(code) && attempt < MAX_RETRIES) {
      const waitMs = INITIAL_BACKOFF_MS * Math.pow(2, attempt - 1);
      logWarn(
        `Rate limited (code ${code}). Retrying in ${waitMs / 1000}s... (attempt ${attempt}/${MAX_RETRIES})`
      );
      await sleep(waitMs);
      lastError = new Error(err.error?.message ?? `HTTP ${res.status}`);
      continue;
    }

    // Permission error — give a clear message
    if (code === 190 || code === 200) {
      throw new Error(
        `Invalid or expired token. Get a new one at https://developers.facebook.com/tools/explorer/ with permissions: ads_management, pages_read_engagement, leads_retrieval`
      );
    }

    if (code === 10 || code === 273 || code === 294) {
      throw new Error(
        `No access to the requested resource (code ${code}). Check Business Settings → Ad Accounts and ensure your user/token has the right permissions.\nAPI message: ${err.error?.message}`
      );
    }

    throw new Error(
      `Meta API error (code ${code}): ${err.error?.message ?? res.statusText}`
    );
  }

  throw lastError ?? new Error('Max retries reached');
}

/**
 * Convenience: GET request.
 */
export async function metaGet<T = Record<string, unknown>>(
  path: string,
  token: string,
  params?: Record<string, string | number | boolean | object>
): Promise<T> {
  return metaFetch<T>(path, token, { method: 'GET', params });
}

/**
 * Convenience: POST request.
 */
export async function metaPost<T = Record<string, unknown>>(
  path: string,
  token: string,
  body: Record<string, unknown>
): Promise<T> {
  return metaFetch<T>(path, token, { method: 'POST', body });
}

/**
 * Validate that the token is valid by hitting /me.
 */
export async function validateToken(token: string): Promise<{ id: string; name: string }> {
  return metaGet<{ id: string; name: string }>('me', token, {
    fields: 'id,name',
  });
}

/**
 * Validate access to the ad account.
 */
export async function validateAdAccount(
  accountId: string,
  token: string
): Promise<{ id: string; name: string; currency: string }> {
  return metaGet<{ id: string; name: string; currency: string }>(
    accountId,
    token,
    { fields: 'id,name,currency' }
  );
}

/**
 * Validate access to the page.
 */
export async function validatePage(
  pageId: string,
  token: string
): Promise<{ id: string; name: string }> {
  return metaGet<{ id: string; name: string }>(pageId, token, {
    fields: 'id,name',
  });
}
