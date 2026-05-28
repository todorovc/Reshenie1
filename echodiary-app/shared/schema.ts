import { z } from "zod";

/**
 * EchoDiary intentionally does NOT persist Spotify tokens in SQLite.
 * Tokens live in server-side session memory only (see server/spotify.ts and
 * server/routes.ts). These user types are kept only as a small placeholder
 * for the template storage interface; they are not used by the app at runtime.
 */
export const insertUserSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = InsertUser & { id: number };

// -----------------------------------------------------------------------------
// API shapes shared between client and server
// -----------------------------------------------------------------------------

export interface AppConfig {
  spotifyConfigured: boolean;
  authStatus: "spotify" | "demo" | "unauthenticated";
  scopes: string[];
}

export interface UserProfile {
  id: string;
  displayName: string;
  email: string | null;
  imageUrl: string | null;
  country: string | null;
  product: string | null;
  followers: number | null;
  source: "spotify" | "demo";
}

export interface TrackArtist {
  id: string;
  name: string;
}

export interface RecentTrack {
  id: string;
  name: string;
  artists: TrackArtist[];
  album: string;
  albumImageUrl: string | null;
  durationMs: number;
  popularity: number;
  playedAt: string; // ISO timestamp
  liked: boolean;
  previewUrl: string | null;
  externalUrl: string | null;
}

export interface ListeningHistory {
  tracks: RecentTrack[];
  source: "spotify" | "demo";
  fetchedAt: string;
}

export interface ArtistAggregate {
  artistId: string;
  artistName: string;
  trackCount: number;
  listeningTimeMs: number;
}

export interface InsightsResponse {
  metric: "track_count" | "listening_time";
  totalTracks: number;
  totalListeningTimeMs: number;
  likedCount: number;
  likedPercentage: number;
  uniqueArtistCount: number;
  topArtists: ArtistAggregate[];
  source: "spotify" | "demo";
}
