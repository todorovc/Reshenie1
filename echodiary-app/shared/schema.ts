import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

/**
 * EchoDiary intentionally does NOT persist Spotify tokens in SQLite.
 * Tokens live in server-side session memory only (see server/spotify.ts and
 * server/routes.ts). The users table is kept as a placeholder so the storage
 * layer compiles cleanly; it is not used by the app at runtime.
 */
export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

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
