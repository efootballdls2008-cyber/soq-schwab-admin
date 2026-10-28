const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

/**
 * TOKEN STORAGE — SECURITY NOTE
 *
 * The admin JWT is stored in sessionStorage rather than localStorage.
 *
 * Why sessionStorage is better than localStorage for an admin token:
 *   • Scoped to the current browser tab — closing the tab clears it automatically.
 *   • Not shared across tabs, so a compromised tab cannot read another tab's token.
 *   • Not persisted across browser restarts, reducing the window of exposure.
 *
 * Why this is still not as secure as httpOnly cookies:
 *   • Any JavaScript running on the page (e.g. from an XSS attack) can still
 *     read sessionStorage. httpOnly cookies are invisible to JS entirely.
 *
 * Long-term recommendation:
 *   Move to httpOnly, SameSite=Strict cookies set by the backend on login.
 *   This requires the admin SPA and the API to share an origin (same domain/subdomain)
 *   or the backend to set the cookie with appropriate CORS credentials support.
 *   Until that infrastructure change is made, sessionStorage is the best available
 *   option for a separate-origin SPA + API architecture.
 */
const TOKEN_KEY = 'admin_token'

function getAuthHeaders(): HeadersInit {
  const token = sessionStorage.getItem(TOKEN_KEY)
  const headers: HeadersInit = { 'Content-Type': 'application/json' }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  return headers
}

/** Unwrap the server's `{ success, data }` envelope. */
async function unwrap<T>(res: Response, path: string): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { message?: string }
    throw new Error(body.message ?? `REQUEST ${path} failed: ${res.status}`)
  }
  const json = await res.json() as { success: boolean; data: T } | T
  if (json !== null && typeof json === 'object' && 'data' in (json as object)) {
    return (json as { success: boolean; data: T }).data
  }
  return json as T
}

/**
 * In-flight deduplication for GET requests.
 * Caches the parsed JSON result (not the raw Response) so multiple concurrent
 * callers share the same promise without consuming an already-read stream.
 */
const inFlightGets = new Map<string, Promise<unknown>>()

/**
 * Retry once after a short delay when the server returns 429.
 * Reads the Retry-After header if present, otherwise waits 2 seconds.
 */
async function fetchWithRetry(
  url: string,
  options: RequestInit,
): Promise<Response> {
  const res = await fetch(url, options)

  if (res.status === 429) {
    const retryAfter = res.headers.get('Retry-After')
    const waitMs = retryAfter ? parseFloat(retryAfter) * 1000 : 2000
    await new Promise((r) => setTimeout(r, waitMs))
    return fetch(url, options)
  }

  return res
}

export async function get<T>(path: string): Promise<T> {
  const url = `${BASE_URL}${path}`
  const options: RequestInit = { headers: getAuthHeaders() }

  // Dedup handles its own 429 retry internally via fetchWithRetry fallback.
  // For GET requests we go through dedup; the dedup layer calls unwrap directly.
  if (inFlightGets.has(url)) {
    return inFlightGets.get(url)! as Promise<T>
  }

  const promise = (async () => {
    const res = await fetchWithRetry(url, options)
    return unwrap<T>(res, path)
  })()

  inFlightGets.set(url, promise)
  try {
    return await promise
  } finally {
    inFlightGets.delete(url)
  }
}

export async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetchWithRetry(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(body),
  })
  return unwrap<T>(res, path)
}

export async function patch<T>(path: string, body: unknown): Promise<T> {
  const res = await fetchWithRetry(`${BASE_URL}${path}`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(body),
  })
  return unwrap<T>(res, path)
}

export async function put<T>(path: string, body: unknown): Promise<T> {
  const res = await fetchWithRetry(`${BASE_URL}${path}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(body),
  })
  return unwrap<T>(res, path)
}

export async function del<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetchWithRetry(`${BASE_URL}${path}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
    ...(body !== undefined && { body: JSON.stringify(body) }),
  })
  return unwrap<T>(res, path)
}
