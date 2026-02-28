import axios, { AxiosInstance } from 'axios';
import { config } from '../config';
import { getToken, upsertToken } from '../db/database';

const WHOOP_API = config.whoop.apiBase;

// ── Token refresh ─────────────────────────────────────────────────────────
async function refreshAccessToken(userId: number): Promise<string> {
  const tokenRow = getToken(userId);
  if (!tokenRow) throw new Error('No token found for user');

  const res = await axios.post(config.whoop.tokenUrl, new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: tokenRow.refresh_token,
    client_id: config.whoop.clientId,
    client_secret: config.whoop.clientSecret,
  }).toString(), { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });

  const { access_token, refresh_token, expires_in } = res.data;
  const expiresAt = new Date(Date.now() + expires_in * 1000);
  upsertToken(userId, access_token, refresh_token, expiresAt);
  return access_token;
}

// ── Authenticated API client ──────────────────────────────────────────────
export async function getWhoopClient(userId: number): Promise<AxiosInstance> {
  const tokenRow = getToken(userId);
  if (!tokenRow) throw new Error('No token found');

  let token = tokenRow.access_token;
  const expires = new Date(tokenRow.expires_at).getTime();

  // Refresh 5 minutes before expiry
  if (Date.now() > expires - 5 * 60 * 1000) {
    token = await refreshAccessToken(userId);
  }

  const client = axios.create({
    baseURL: WHOOP_API,
    headers: { Authorization: `Bearer ${token}` },
  });

  // Intercept 401 → refresh and retry once
  client.interceptors.response.use(undefined, async (err) => {
    if (err.response?.status === 401 && !err.config._retried) {
      err.config._retried = true;
      const newToken = await refreshAccessToken(userId);
      err.config.headers.Authorization = `Bearer ${newToken}`;
      return client(err.config);
    }
    throw err;
  });

  return client;
}

// ── Paginated fetch helper ────────────────────────────────────────────────
async function fetchAllPages<T>(
  client: AxiosInstance,
  url: string,
  params: Record<string, string>
): Promise<T[]> {
  const all: T[] = [];
  let nextToken: string | null = null;

  do {
    const query: Record<string, string> = { ...params, limit: '25' };
    if (nextToken) query.nextToken = nextToken;

    const res = await client.get(url, { params: query });
    const records: T[] = res.data.records ?? [];
    all.push(...records);
    nextToken = res.data.next_token ?? null;
  } while (nextToken);

  return all;
}

// ── WHOOP API calls ───────────────────────────────────────────────────────
export async function fetchUserProfile(client: AxiosInstance) {
  const res = await client.get('/v2/user/profile/basic');
  return res.data;
}

export async function fetchBodyMeasurements(client: AxiosInstance) {
  const res = await client.get('/v2/user/measurement/body');
  return res.data;
}

export async function fetchCycles(client: AxiosInstance, start: string, end: string) {
  return fetchAllPages(client, '/v2/cycle', { start, end });
}

export async function fetchRecoveries(client: AxiosInstance, start: string, end: string) {
  return fetchAllPages(client, '/v2/recovery', { start, end });
}

export async function fetchSleeps(client: AxiosInstance, start: string, end: string) {
  return fetchAllPages(client, '/v2/activity/sleep', { start, end });
}

export async function fetchWorkouts(client: AxiosInstance, start: string, end: string) {
  return fetchAllPages(client, '/v2/activity/workout', { start, end });
}

// ── Exchange OAuth code for tokens ────────────────────────────────────────
export async function exchangeCode(code: string): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
}> {
  const res = await axios.post(config.whoop.tokenUrl, new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: config.whoop.redirectUri,
    client_id: config.whoop.clientId,
    client_secret: config.whoop.clientSecret,
  }).toString(), { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
  return res.data;
}
