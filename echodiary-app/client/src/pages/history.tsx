import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Heart, Clock, Music2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  formatDuration,
  formatTimeOfDay,
  groupByDay,
} from "@/lib/format";
import type { AppConfig, ListeningHistory } from "@shared/schema";

export default function History() {
  const [, setLocation] = useLocation();

  const { data: config } = useQuery<AppConfig | null>({
    queryKey: ["/api/auth/status"],
  });

  const { data, isLoading, isError } = useQuery<ListeningHistory | null>({
    queryKey: ["/api/listening-history"],
    enabled: !!config && config.authStatus !== "unauthenticated",
  });

  if (!config) return <LoadingState />;

  if (config.authStatus === "unauthenticated") {
    return (
      <Empty
        title="No diary entries yet"
        body="Sign in with Spotify or open the demo to populate your diary."
        action="Go to home"
        onAction={() => setLocation("/")}
      />
    );
  }

  if (isLoading) return <LoadingState />;

  if (isError) {
    return (
      <Empty
        title="We couldn't reach the diary"
        body="There was a problem loading your recent plays. Try again in a moment."
        action="Back to home"
        onAction={() => setLocation("/")}
      />
    );
  }

  if (!data || data.tracks.length === 0) {
    return (
      <Empty
        title="No recent plays"
        body="Once you listen to a few tracks they will show up here, grouped by day."
        action="Open profile"
        onAction={() => setLocation("/profile")}
      />
    );
  }

  const groups = groupByDay(data.tracks);

  return (
    <div className="space-y-10">
      <header>
        <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
          Listening history
        </p>
        <h1 className="mt-2 font-display text-2xl sm:text-3xl tracking-tight">
          Recent plays
        </h1>
        <p
          className="mt-2 text-sm text-muted-foreground"
          data-testid="text-history-meta"
        >
          {data.tracks.length} entries
          {data.source === "demo" ? " · demo data" : " · from Spotify"}
        </p>
      </header>

      <div className="space-y-12">
        {groups.map((group) => (
          <section
            key={group.key}
            aria-labelledby={`day-${group.key}`}
            data-testid={`section-day-${group.key}`}
          >
            <div className="flex items-baseline justify-between mb-4">
              <h2
                id={`day-${group.key}`}
                className="font-display text-lg tracking-tight"
              >
                {group.day}
              </h2>
              <span className="text-xs text-muted-foreground">
                {group.items.length}{" "}
                {group.items.length === 1 ? "play" : "plays"}
              </span>
            </div>

            <ol className="rounded-xl border border-border/60 bg-card overflow-hidden divide-y divide-border/60">
              {group.items.map((track) => (
                <li
                  key={track.id}
                  className="flex items-center gap-3 sm:gap-4 px-3 sm:px-4 py-3 hover-elevate"
                  data-testid={`row-track-${track.id}`}
                >
                  <div className="relative h-12 w-12 sm:h-14 sm:w-14 rounded-md overflow-hidden bg-muted shrink-0 border border-border/40">
                    {track.albumImageUrl ? (
                      <img
                        src={track.albumImageUrl}
                        alt=""
                        loading="lazy"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-muted-foreground">
                        <Music2 className="h-5 w-5" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <p
                        className="font-medium text-sm sm:text-[0.95rem] truncate"
                        title={track.name}
                        data-testid={`text-track-name-${track.id}`}
                      >
                        {track.name}
                      </p>
                      {track.liked && (
                        <span
                          className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-primary"
                          data-testid={`badge-liked-${track.id}`}
                          aria-label="Saved to your library"
                        >
                          <Heart className="h-3 w-3 fill-current" />
                          Liked
                        </span>
                      )}
                    </div>
                    <p
                      className="text-xs sm:text-sm text-muted-foreground truncate"
                      title={track.artists.map((a) => a.name).join(", ")}
                    >
                      {track.artists.map((a) => a.name).join(", ")}{" "}
                      <span className="text-muted-foreground/70">·</span>{" "}
                      <span className="text-muted-foreground/80">
                        {track.album}
                      </span>
                    </p>
                  </div>

                  <div className="hidden sm:flex flex-col items-end gap-1 text-xs text-muted-foreground shrink-0">
                    <PopularityBar value={track.popularity} />
                    <span>{Math.round(track.popularity)}/100</span>
                  </div>

                  <div className="flex flex-col items-end gap-0.5 text-xs sm:text-sm shrink-0 min-w-[64px]">
                    <span
                      className="inline-flex items-center gap-1 text-foreground"
                      data-testid={`text-duration-${track.id}`}
                    >
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      {formatDuration(track.durationMs)}
                    </span>
                    <span
                      className="text-muted-foreground"
                      data-testid={`text-played-at-${track.id}`}
                    >
                      {formatTimeOfDay(track.playedAt)}
                    </span>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        ))}
      </div>
    </div>
  );
}

function PopularityBar({ value }: { value: number }) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div
      className="h-1 w-16 rounded-full bg-muted overflow-hidden"
      role="img"
      aria-label={`Popularity ${clamped} out of 100`}
    >
      <div
        className={cn("h-full bg-primary/80")}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

function LoadingState() {
  return (
    <div className="space-y-10">
      <Skeleton className="h-8 w-48" />
      {[0, 1].map((g) => (
        <div key={g}>
          <Skeleton className="h-5 w-32 mb-4" />
          <div className="rounded-xl border border-border/60 bg-card divide-y divide-border/60">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-3">
                <Skeleton className="h-12 w-12 rounded-md" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="h-4 w-12" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function Empty({
  title,
  body,
  action,
  onAction,
}: {
  title: string;
  body: string;
  action: string;
  onAction: () => void;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card px-6 py-12 text-center">
      <h2 className="font-display text-xl tracking-tight">{title}</h2>
      <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
        {body}
      </p>
      <div className="mt-5">
        <Button onClick={onAction} data-testid="button-empty-action">
          {action}
        </Button>
      </div>
    </div>
  );
}
