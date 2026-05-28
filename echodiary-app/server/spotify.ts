import crypto from "node:crypto";
import type { Request } from "express";

export const SPOTIFY_SCOPES = [
  "user-read-private",
  "user-read-email",
  "user-read-recently-played",
  "user-library-read",
];

export interface SpotifyTokens {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: number; // epoch ms
  scope: string;
}

export function isSpotifyConfigured(): boolean {
  return Boolean(
    process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_REDIRECT_URI,
  );
}

export function getRedirectUri(): string {
  return process.env.SPOTIFY_REDIRECT_URI || "";
}

export function getClientId(): string {
  return process.env.SPOTIFY_CLIENT_ID || "";
}

export function getClientSecret(): string | undefined {
  return process.env.SPOTIFY_CLIENT_SECRET || undefined;
}

// ---------- PKCE helpers ----------

function base64UrlEncode(buf: Buffer): string {
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export function generateCodeVerifier(): string {
  return base64UrlEncode(crypto.randomBytes(64)).slice(0, 96);
}

export function deriveCodeChallenge(verifier: string): string {
  return base64UrlEncode(crypto.createHash("sha256").update(verifier).digest());
}

export function generateState(): string {
  return base64UrlEncode(crypto.randomBytes(24));
}

// ---------- Authorization URL ----------

export function buildAuthorizationUrl(opts: {
  state: string;
  codeChallenge: string;
}): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: getClientId(),
    redirect_uri: getRedirectUri(),
    scope: SPOTIFY_SCOPES.join(" "),
    state: opts.state,
    code_challenge_method: "S256",
    code_challenge: opts.codeChallenge,
    show_dialog: "true",
  });
  return `https://accounts.spotify.com/authorize?${params.toString()}`;
}

// ---------- Token exchange ----------

interface SpotifyTokenResponse {
  access_token: string;
  token_type: string;
  scope: string;
  expires_in: number;
  refresh_token?: string;
}

export async function exchangeCodeForTokens(
  code: string,
  codeVerifier: string,
): Promise<SpotifyTokens> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: getRedirectUri(),
    client_id: getClientId(),
    code_verifier: codeVerifier,
  });

  const headers: Record<string, string> = {
    "Content-Type": "application/x-www-form-urlencoded",
  };

  // If a client secret is provided, use confidential client auth (recommended
  // for server-side flows). PKCE still applies.
  const secret = getClientSecret();
  if (secret) {
    headers.Authorization =
      "Basic " +
      Buffer.from(`${getClientId()}:${secret}`).toString("base64");
  }

  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers,
    body: body.toString(),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Spotify token exchange failed: ${res.status} ${txt}`);
  }

  const json = (await res.json()) as SpotifyTokenResponse;
  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token ?? null,
    expiresAt: Date.now() + (json.expires_in - 30) * 1000,
    scope: json.scope,
  };
}

export async function refreshAccessToken(
  refreshToken: string,
): Promise<SpotifyTokens> {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: getClientId(),
  });

  const headers: Record<string, string> = {
    "Content-Type": "application/x-www-form-urlencoded",
  };
  const secret = getClientSecret();
  if (secret) {
    headers.Authorization =
      "Basic " +
      Buffer.from(`${getClientId()}:${secret}`).toString("base64");
  }

  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers,
    body: body.toString(),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Spotify refresh failed: ${res.status} ${txt}`);
  }

  const json = (await res.json()) as SpotifyTokenResponse;
  return {
    accessToken: json.access_token,
    // Spotify may or may not rotate the refresh token; keep the old one if not.
    refreshToken: json.refresh_token ?? refreshToken,
    expiresAt: Date.now() + (json.expires_in - 30) * 1000,
    scope: json.scope,
  };
}

// ---------- Spotify Web API helpers ----------

export async function ensureFreshTokens(
  req: Request,
): Promise<SpotifyTokens | null> {
  const tokens = req.session?.spotifyTokens;
  if (!tokens) return null;
  if (Date.now() < tokens.expiresAt) return tokens;
  if (!tokens.refreshToken) return null;
  try {
    const refreshed = await refreshAccessToken(tokens.refreshToken);
    req.session.spotifyTokens = refreshed;
    return refreshed;
  } catch (err) {
    console.error("Failed to refresh Spotify tokens", err);
    return null;
  }
}

export async function spotifyFetch<T>(
  accessToken: string,
  path: string,
): Promise<T> {
  const res = await fetch(`https://api.spotify.com/v1${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Spotify API ${path} failed: ${res.status} ${txt}`);
  }
  return (await res.json()) as T;
}
