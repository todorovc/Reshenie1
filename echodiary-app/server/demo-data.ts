import type {
  UserProfile,
  RecentTrack,
  ListeningHistory,
} from "@shared/schema";

const DEMO_PROFILE: UserProfile = {
  id: "demo-user-1",
  displayName: "Mira Ostrov",
  email: "mira@echodiary.local",
  imageUrl: null,
  country: "DE",
  product: "premium",
  followers: 142,
  source: "demo",
};

interface RawTrack {
  name: string;
  artists: string[];
  album: string;
  durationMs: number;
  popularity: number;
  liked: boolean;
  hue: number; // for synthetic album cover gradient
}

// Curated, varied demo catalog — indie, jazz, ambient, electronic, classical.
const CATALOG: RawTrack[] = [
  { name: "Slow Burn",        artists: ["Lia Wren"],                 album: "Paper Lanterns",        durationMs: 224000, popularity: 62, liked: true,  hue: 12  },
  { name: "Northern Drift",   artists: ["Aurora Heights"],           album: "Cold Glass",            durationMs: 198000, popularity: 71, liked: true,  hue: 200 },
  { name: "Coda for Rain",    artists: ["Yuki Mori"],                album: "Six Quiet Rooms",       durationMs: 312000, popularity: 44, liked: false, hue: 230 },
  { name: "Marble Heart",     artists: ["The Tall Grass"],           album: "Roman Holiday",         durationMs: 256000, popularity: 58, liked: true,  hue: 28  },
  { name: "Vert\u00e9bre",          artists: ["Camille Roux"],             album: "Cha\u00eene",                durationMs: 187000, popularity: 49, liked: false, hue: 320 },
  { name: "Pollen",           artists: ["Lia Wren"],                 album: "Paper Lanterns",        durationMs: 211000, popularity: 60, liked: true,  hue: 12  },
  { name: "Ferry, 6am",       artists: ["Marcus Lin", "Aurora Heights"], album: "Crossings",         durationMs: 274000, popularity: 53, liked: false, hue: 195 },
  { name: "Saltwater Letter", artists: ["The Tall Grass"],           album: "Roman Holiday",         durationMs: 233000, popularity: 51, liked: true,  hue: 28  },
  { name: "Hexagram",         artists: ["Field Recordings"],         album: "Tape III",              durationMs: 165000, popularity: 38, liked: false, hue: 145 },
  { name: "Embers, Slowly",   artists: ["Yuki Mori"],                album: "Six Quiet Rooms",       durationMs: 285000, popularity: 47, liked: true,  hue: 230 },
  { name: "Window 12",        artists: ["Camille Roux"],             album: "Cha\u00eene",                durationMs: 201000, popularity: 55, liked: false, hue: 320 },
  { name: "Half Tide",        artists: ["Marcus Lin"],               album: "Estuary",               durationMs: 244000, popularity: 64, liked: true,  hue: 175 },
  { name: "Inner Courtyard",  artists: ["Aurora Heights"],           album: "Cold Glass",            durationMs: 192000, popularity: 73, liked: true,  hue: 200 },
  { name: "First Light Sonata", artists: ["Elena Petrova"],          album: "Etudes for Morning",    durationMs: 348000, popularity: 41, liked: false, hue: 50  },
  { name: "Cassette",         artists: ["Field Recordings"],         album: "Tape III",              durationMs: 152000, popularity: 36, liked: true,  hue: 145 },
  { name: "Tideline",         artists: ["Lia Wren"],                 album: "Paper Lanterns",        durationMs: 219000, popularity: 65, liked: false, hue: 12  },
  { name: "Telegraph Hill",   artists: ["The Tall Grass"],           album: "Roman Holiday",         durationMs: 268000, popularity: 56, liked: true,  hue: 28  },
  { name: "Stoa",             artists: ["Yuki Mori"],                album: "Six Quiet Rooms",       durationMs: 297000, popularity: 45, liked: false, hue: 230 },
  { name: "Half-Light",       artists: ["Marcus Lin"],               album: "Estuary",               durationMs: 226000, popularity: 62, liked: true,  hue: 175 },
  { name: "Bell, Far Off",    artists: ["Elena Petrova"],            album: "Etudes for Morning",    durationMs: 312000, popularity: 39, liked: true,  hue: 50  },
  { name: "Backroad",         artists: ["The Tall Grass"],           album: "Roman Holiday",         durationMs: 248000, popularity: 60, liked: false, hue: 28  },
  { name: "Underdrawing",     artists: ["Camille Roux"],             album: "Cha\u00eene",                durationMs: 215000, popularity: 50, liked: true,  hue: 320 },
  { name: "Open Window",      artists: ["Aurora Heights"],           album: "Cold Glass",            durationMs: 207000, popularity: 68, liked: false, hue: 200 },
  { name: "Pier",             artists: ["Marcus Lin"],               album: "Estuary",               durationMs: 231000, popularity: 61, liked: true,  hue: 175 },
  { name: "Returning",        artists: ["Lia Wren"],                 album: "Paper Lanterns",        durationMs: 240000, popularity: 67, liked: true,  hue: 12  },
];

function slug(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function fakeCoverUrl(album: string, hue: number): string {
  // Build a tiny inline SVG cover so the UI has a real image without external
  // fetches. Encoded as data URL.
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="hsl(${hue}, 55%, 32%)"/>
      <stop offset="100%" stop-color="hsl(${(hue + 40) % 360}, 60%, 18%)"/>
    </linearGradient>
  </defs>
  <rect width="200" height="200" fill="url(#g)"/>
  <g opacity="0.85" stroke="hsl(${hue}, 35%, 92%)" stroke-width="1.2" stroke-linecap="round" fill="none">
    <path d="M20 130 Q40 110 60 130 T100 130 T140 130 T180 130"/>
    <path d="M20 150 Q40 132 60 150 T100 150 T140 150 T180 150" opacity="0.5"/>
  </g>
  <text x="20" y="40" font-family="Georgia, serif" font-size="14" fill="hsl(${hue}, 30%, 94%)" opacity="0.85">${album.slice(0, 24)}</text>
</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/**
 * Build a deterministic-ish recent-played feed spanning the last several days.
 * Each call returns timestamps relative to now so the demo always feels fresh.
 */
export function buildDemoListeningHistory(): ListeningHistory {
  const now = Date.now();
  // Mix the catalog to fill ~42 entries, weaving repeats so insights look real.
  // Use a coprime stride (11 vs 25) so we touch every catalog entry, then add
  // a handful of deliberate repeats of favorite tracks at the start.
  const order: number[] = [];
  const stride = 11;
  for (let i = 0; i < 28; i++) {
    order.push((i * stride) % CATALOG.length);
  }
  // Sprinkle in 14 repeat plays of liked tracks to make "top artists" feel real.
  const likedIdxs = CATALOG.map((t, i) => (t.liked ? i : -1)).filter(
    (n) => n >= 0,
  );
  for (let i = 0; i < 14; i++) {
    order.push(likedIdxs[(i * 3) % likedIdxs.length]);
  }

  // Pre-generate a schedule of play-offsets in minutes-ago that spans the last
  // ~6 days, clustered around evenings to feel like a real listening pattern.
  const offsetsMin: number[] = [];
  let cursor = 30; // start ~30min ago for the most recent play
  for (let day = 0; day < 6; day++) {
    const playsThisDay = day === 0 ? 9 : day === 1 ? 8 : day < 4 ? 7 : 5;
    for (let p = 0; p < playsThisDay; p++) {
      // Each track ~4 min apart with small jitter, anchored on this day.
      cursor += 3 + ((p * 7) % 6);
      offsetsMin.push(cursor);
    }
    // Jump to roughly the next day's evening cluster (≈20h gap).
    cursor += 16 * 60;
  }

  const tracks: RecentTrack[] = order.map((idx, i) => {
    const t = CATALOG[idx];
    const minutesAgo = offsetsMin[i] ?? offsetsMin[offsetsMin.length - 1];
    const playedAt = new Date(now - minutesAgo * 60 * 1000).toISOString();
    return {
      id: `${slug(t.name)}-${i}`,
      name: t.name,
      artists: t.artists.map((a) => ({ id: slug(a), name: a })),
      album: t.album,
      albumImageUrl: fakeCoverUrl(t.album, t.hue),
      durationMs: t.durationMs,
      popularity: t.popularity,
      playedAt,
      liked: t.liked,
      previewUrl: null,
      externalUrl: null,
    };
  });

  return { tracks, source: "demo", fetchedAt: new Date().toISOString() };
}

export function getDemoProfile(): UserProfile {
  return DEMO_PROFILE;
}
