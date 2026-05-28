import type { Express, Request, Response } from "express";
import type { Server } from "node:http";
import { installSession } from "./session";
import {
  SPOTIFY_SCOPES,
  buildAuthorizationUrl,
  deriveCodeChallenge,
  ensureFreshTokens,
  exchangeCodeForTokens,
  generateCodeVerifier,
  generateState,
  isSpotifyConfigured,
  spotifyFetch,
} from "./spotify";
import {
  buildDemoListeningHistory,
  getDemoProfile,
} from "./demo-data";
import type {
  AppConfig,
  ArtistAggregate,
  InsightsResponse,
  ListeningHistory,
  RecentTrack,
  UserProfile,
} from "@shared/schema";

// ---------- Spotify response shapes (partial) ----------

interface SpotifyMeResponse {
  id: string;
  display_name: string | null;
  email?: string;
  country?: string;
  product?: string;
  followers?: { total: number };
  images?: Array<{ url: string; width?: number; height?: number }>;
}

interface SpotifyRecentItem {
  played_at: string;
  track: {
    id: string;
    name: string;
    duration_ms: number;
    popularity: number;
    preview_url: string | null;
    external_urls?: { spotify?: string };
    artists: Array<{ id: string; name: string }>;
    album: {
      name: string;
      images?: Array<{ url: string; width?: number; height?: number }>;
    };
  };
}
interface SpotifyRecentResponse {
  items: SpotifyRecentItem[];
}

interface SpotifySavedTracksResponse {
  items: Array<{ track: { id: string } }>;
  next: string | null;
}

// ---------- Helpers ----------

function authState(req: Request): "spotify" | "demo" | "unauthenticated" {
  if (req.session.spotifyTokens) return "spotify";
  if (req.session.demoActive) return "demo";
  return "unauthenticated";
}

function pickBestImage(
  images?: Array<{ url: string; width?: number; height?: number }>,
): string | null {
  if (!images || images.length === 0) return null;
  // Spotify orders images largest first.
  return images[0].url;
}

function aggregateArtists(tracks: RecentTrack[]): ArtistAggregate[] {
  const map = new Map<string, ArtistAggregate>();
  for (const t of tracks) {
    for (const a of t.artists) {
      const existing = map.get(a.id);
      if (existing) {
        existing.trackCount += 1;
        existing.listeningTimeMs += t.durationMs;
      } else {
        map.set(a.id, {
          artistId: a.id,
          artistName: a.name,
          trackCount: 1,
          listeningTimeMs: t.durationMs,
        });
      }
    }
  }
  return Array.from(map.values());
}

// Fetch up to ~200 saved track IDs to compute "liked" flags. Spotify caps the
// Saved Tracks endpoint at 50 per page; we walk a few pages.
async function fetchSavedTrackIdSet(
  accessToken: string,
  maxPages = 4,
): Promise<Set<string>> {
  const ids = new Set<string>();
  let url = "/me/tracks?limit=50";
  for (let i = 0; i < maxPages && url; i++) {
    const res = await spotifyFetch<SpotifySavedTracksResponse>(
      accessToken,
      url,
    );
    for (const item of res.items) ids.add(item.track.id);
    if (!res.next) break;
    // res.next is an absolute URL; convert to path for spotifyFetch.
    const u = new URL(res.next);
    url = u.pathname.replace(/^\/v1/, "") + u.search;
  }
  return ids;
}

async function getRealListeningHistory(
  req: Request,
): Promise<ListeningHistory | null> {
  const tokens = await ensureFreshTokens(req);
  if (!tokens) return null;

  const recent = await spotifyFetch<SpotifyRecentResponse>(
    tokens.accessToken,
    "/me/player/recently-played?limit=50",
  );

  let likedIds: Set<string> = new Set();
  try {
    likedIds = await fetchSavedTrackIdSet(tokens.accessToken);
  } catch (err) {
    console.warn(
      "Failed to fetch saved tracks; liked flags will be false",
      err,
    );
  }

  const tracks: RecentTrack[] = recent.items.map((item) => ({
    id: `${item.track.id}-${item.played_at}`,
    name: item.track.name,
    artists: item.track.artists.map((a) => ({ id: a.id, name: a.name })),
    album: item.track.album.name,
    albumImageUrl: pickBestImage(item.track.album.images),
    durationMs: item.track.duration_ms,
    popularity: item.track.popularity,
    playedAt: item.played_at,
    liked: likedIds.has(item.track.id),
    previewUrl: item.track.preview_url,
    externalUrl: item.track.external_urls?.spotify ?? null,
  }));

  return { tracks, source: "spotify", fetchedAt: new Date().toISOString() };
}

async function getRealProfile(req: Request): Promise<UserProfile | null> {
  const tokens = await ensureFreshTokens(req);
  if (!tokens) return null;
  const me = await spotifyFetch<SpotifyMeResponse>(tokens.accessToken, "/me");
  return {
    id: me.id,
    displayName: me.display_name || me.id,
    email: me.email ?? null,
    imageUrl: pickBestImage(me.images),
    country: me.country ?? null,
    product: me.product ?? null,
    followers: me.followers?.total ?? null,
    source: "spotify",
  };
}

// ---------- Route registration ----------

export async function registerRoutes(
  httpServer: Server,
  app: Express,
): Promise<Server> {
  installSession(app);

  // -----------------------------------------------------------------------
  // Config / auth status
  // -----------------------------------------------------------------------
  app.get(["/api/config", "/api/auth/status"], (req, res) => {
    const payload: AppConfig = {
      spotifyConfigured: isSpotifyConfigured(),
      authStatus: authState(req),
      scopes: SPOTIFY_SCOPES,
    };
    res.json(payload);
  });

  // -----------------------------------------------------------------------
  // Spotify OAuth — PKCE
  // -----------------------------------------------------------------------
  app.get("/auth/login", (req, res) => {
    if (!isSpotifyConfigured()) {
      // Friendly redirect with an inline notice. The home page reads the error
      // from window.location.search so it survives the hash router.
      return res.redirect("/?auth_error=not_configured#/");
    }
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = deriveCodeChallenge(codeVerifier);
    const state = generateState();

    req.session.pkce = {
      codeVerifier,
      state,
      createdAt: Date.now(),
    };

    const url = buildAuthorizationUrl({ state, codeChallenge });
    res.redirect(url);
  });

  app.get("/auth/callback", async (req, res) => {
    const { code, state, error } = req.query as Record<string, string>;

    if (error) {
      return res.redirect(
        `/?auth_error=${encodeURIComponent(error)}#/`,
      );
    }
    if (!code || !state) {
      return res.redirect("/?auth_error=missing_params#/");
    }
    const pkce = req.session.pkce;
    if (!pkce || pkce.state !== state) {
      return res.redirect("/?auth_error=state_mismatch#/");
    }
    try {
      const tokens = await exchangeCodeForTokens(code, pkce.codeVerifier);
      req.session.spotifyTokens = tokens;
      req.session.demoActive = false;
      delete req.session.pkce;
      res.redirect("/#/profile");
    } catch (err) {
      console.error(err);
      res.redirect("/?auth_error=exchange_failed#/");
    }
  });

  app.post("/auth/logout", (req, res) => {
    const isProd = process.env.NODE_ENV === "production";
    const cookieName = isProd ? "__Host-echodiary.sid" : "echodiary.sid";
    req.session.destroy(() => {
      res.clearCookie(cookieName, { path: "/" });
      res.json({ ok: true });
    });
  });

  // -----------------------------------------------------------------------
  // Demo session
  // -----------------------------------------------------------------------
  app.post("/api/demo-login", (req, res) => {
    req.session.demoActive = true;
    delete req.session.spotifyTokens;
    res.json({ ok: true, mode: "demo" });
  });

  // -----------------------------------------------------------------------
  // Profile
  // -----------------------------------------------------------------------
  app.get("/api/profile", async (req, res) => {
    try {
      if (req.session.spotifyTokens) {
        const profile = await getRealProfile(req);
        if (profile) return res.json(profile);
        // tokens existed but refresh failed — fall through to 401
      }
      if (req.session.demoActive) {
        return res.json(getDemoProfile());
      }
      return res.status(401).json({ message: "Not authenticated" });
    } catch (err) {
      console.error(err);
      res.status(502).json({ message: "Failed to load profile" });
    }
  });

  // -----------------------------------------------------------------------
  // Listening history
  // -----------------------------------------------------------------------
  app.get("/api/listening-history", async (req, res) => {
    try {
      if (req.session.spotifyTokens) {
        const history = await getRealListeningHistory(req);
        if (history) return res.json(history);
      }
      if (req.session.demoActive) {
        return res.json(buildDemoListeningHistory());
      }
      return res.status(401).json({ message: "Not authenticated" });
    } catch (err) {
      console.error(err);
      res.status(502).json({ message: "Failed to load listening history" });
    }
  });

  // -----------------------------------------------------------------------
  // Insights
  // -----------------------------------------------------------------------
  app.get("/api/insights", async (req, res) => {
    const metricParam = String(req.query.metric || "track_count");
    const metric: "track_count" | "listening_time" =
      metricParam === "listening_time" ? "listening_time" : "track_count";

    try {
      let history: ListeningHistory | null = null;
      if (req.session.spotifyTokens) {
        history = await getRealListeningHistory(req);
      }
      if (!history && req.session.demoActive) {
        history = buildDemoListeningHistory();
      }
      if (!history) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const totalTracks = history.tracks.length;
      const totalListeningTimeMs = history.tracks.reduce(
        (sum, t) => sum + t.durationMs,
        0,
      );
      const likedCount = history.tracks.filter((t) => t.liked).length;
      const likedPercentage =
        totalTracks === 0
          ? 0
          : Math.round((likedCount / totalTracks) * 100);

      const aggregates = aggregateArtists(history.tracks);
      const sorted = [...aggregates].sort((a, b) =>
        metric === "track_count"
          ? b.trackCount - a.trackCount
          : b.listeningTimeMs - a.listeningTimeMs,
      );

      const payload: InsightsResponse = {
        metric,
        totalTracks,
        totalListeningTimeMs,
        likedCount,
        likedPercentage,
        uniqueArtistCount: aggregates.length,
        topArtists: sorted.slice(0, 8),
        source: history.source,
      };
      res.json(payload);
    } catch (err) {
      console.error(err);
      res.status(502).json({ message: "Failed to compute insights" });
    }
  });

  return httpServer;
}
