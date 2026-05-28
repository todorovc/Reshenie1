import session from "express-session";
import createMemoryStore from "memorystore";
import type { Express } from "express";
import type { SpotifyTokens } from "./spotify";

declare module "express-session" {
  interface SessionData {
    // Demo mode
    demoActive?: boolean;

    // Spotify PKCE handshake (cleared once exchanged)
    pkce?: {
      codeVerifier: string;
      state: string;
      createdAt: number;
    };

    // Spotify tokens (server-side only, never exposed to client)
    spotifyTokens?: SpotifyTokens;
  }
}

export function installSession(app: Express): void {
  const MemoryStore = createMemoryStore(session);
  const isProd = process.env.NODE_ENV === "production";
  const secret =
    process.env.SESSION_SECRET ||
    "echodiary-dev-secret-do-not-use-in-production";

  app.set("trust proxy", 1);

  // `__Host-` cookies require Secure + Path=/ + no Domain. They only work
  // over HTTPS, so in plain HTTP dev we fall back to a non-prefixed name.
  const cookieName = isProd ? "__Host-echodiary.sid" : "echodiary.sid";

  app.use(
    session({
      name: cookieName,
      secret,
      resave: false,
      saveUninitialized: false,
      rolling: true,
      store: new MemoryStore({ checkPeriod: 24 * 60 * 60 * 1000 }),
      cookie: {
        httpOnly: true,
        secure: isProd,
        sameSite: "lax",
        path: "/",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      },
    }),
  );
}
