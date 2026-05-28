import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Heart, Music2, Clock, Users } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatLongDuration } from "@/lib/format";
import type { AppConfig, InsightsResponse } from "@shared/schema";

type Metric = "track_count" | "listening_time";

export default function Insights() {
  const [, setLocation] = useLocation();
  const [metric, setMetric] = useState<Metric>("track_count");

  const { data: config } = useQuery<AppConfig | null>({
    queryKey: ["/api/auth/status"],
  });

  const { data, isLoading, isError } = useQuery<InsightsResponse | null>({
    queryKey: ["/api/insights", metric],
    queryFn: async () => {
      const res = await fetch(`/api/insights?metric=${metric}`, {
        credentials: "include",
      });
      if (res.status === 401) return null;
      if (!res.ok) throw new Error(`${res.status}`);
      return (await res.json()) as InsightsResponse;
    },
    enabled: !!config && config.authStatus !== "unauthenticated",
  });

  if (!config) return <LoadingState />;

  if (config.authStatus === "unauthenticated") {
    return (
      <Empty
        title="No insights yet"
        body="Sign in with Spotify or open the demo to see your listening patterns."
        action="Go to home"
        onAction={() => setLocation("/")}
      />
    );
  }

  if (isLoading) return <LoadingState />;

  if (isError || !data) {
    return (
      <Empty
        title="We couldn't compute insights"
        body="There was a problem loading the data. Try again in a moment."
        action="Back to home"
        onAction={() => setLocation("/")}
      />
    );
  }

  return (
    <div className="space-y-12">
      <header>
        <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
          Insights
        </p>
        <h1 className="mt-2 font-display text-2xl sm:text-3xl tracking-tight">
          Patterns from the week
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Computed from your {data.totalTracks} most recent plays
          {data.source === "demo" ? " · demo data" : " · from Spotify"}.
        </p>
      </header>

      {/* KPI grid */}
      <section
        aria-label="Headline statistics"
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        <Kpi
          label="Liked share"
          value={`${data.likedPercentage}%`}
          sub={`${data.likedCount} of ${data.totalTracks} saved`}
          icon={<Heart className="h-3.5 w-3.5" />}
          testId="kpi-liked"
        />
        <Kpi
          label="Recent tracks"
          value={data.totalTracks.toLocaleString()}
          sub="from the listening feed"
          icon={<Music2 className="h-3.5 w-3.5" />}
          testId="kpi-tracks"
        />
        <Kpi
          label="Listening time"
          value={formatLongDuration(data.totalListeningTimeMs)}
          sub="across recent plays"
          icon={<Clock className="h-3.5 w-3.5" />}
          testId="kpi-time"
        />
        <Kpi
          label="Unique artists"
          value={data.uniqueArtistCount.toLocaleString()}
          sub={`top artist plays ${data.topArtists[0]?.trackCount ?? 0}×`}
          icon={<Users className="h-3.5 w-3.5" />}
          testId="kpi-artists"
        />
      </section>

      {/* Top artists chart */}
      <section
        aria-labelledby="top-artists-heading"
        className="rounded-2xl border border-border/60 bg-card p-6 sm:p-8"
      >
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h2
              id="top-artists-heading"
              className="font-display text-lg sm:text-xl tracking-tight"
            >
              Who you reached for
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Top artists ranked by{" "}
              {metric === "track_count" ? "play count" : "listening time"}.
            </p>
          </div>

          <div
            role="tablist"
            aria-label="Ranking metric"
            className="inline-flex rounded-lg border border-border/60 bg-background/60 p-0.5 text-xs"
          >
            <MetricButton
              active={metric === "track_count"}
              onClick={() => setMetric("track_count")}
              testId="button-metric-tracks"
            >
              Track count
            </MetricButton>
            <MetricButton
              active={metric === "listening_time"}
              onClick={() => setMetric("listening_time")}
              testId="button-metric-time"
            >
              Listening time
            </MetricButton>
          </div>
        </div>

        <TopArtistsChart data={data} />
      </section>
    </div>
  );
}

function Kpi({
  label,
  value,
  sub,
  icon,
  testId,
}: {
  label: string;
  value: string;
  sub: string;
  icon: React.ReactNode;
  testId?: string;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-5">
      <div className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </div>
      <p
        className="mt-2 font-display text-2xl tracking-tight"
        data-testid={testId}
      >
        {value}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">{sub}</p>
    </div>
  );
}

function MetricButton({
  active,
  onClick,
  children,
  testId,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  testId?: string;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      data-testid={testId}
      className={cn(
        "px-3 py-1.5 rounded-md transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        active
          ? "bg-foreground text-background"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function TopArtistsChart({ data }: { data: InsightsResponse }) {
  const max = useMemo(() => {
    if (data.topArtists.length === 0) return 1;
    return data.metric === "track_count"
      ? Math.max(...data.topArtists.map((a) => a.trackCount))
      : Math.max(...data.topArtists.map((a) => a.listeningTimeMs));
  }, [data]);

  if (data.topArtists.length === 0) {
    return (
      <p className="mt-6 text-sm text-muted-foreground">
        Not enough plays to rank artists yet.
      </p>
    );
  }

  return (
    <ul
      className="mt-6 space-y-3"
      role="list"
      aria-label="Top artists ranking"
    >
      {data.topArtists.map((a, idx) => {
        const raw =
          data.metric === "track_count" ? a.trackCount : a.listeningTimeMs;
        const pct = (raw / max) * 100;
        const display =
          data.metric === "track_count"
            ? `${a.trackCount} ${a.trackCount === 1 ? "play" : "plays"}`
            : formatLongDuration(a.listeningTimeMs);
        return (
          <li
            key={a.artistId}
            className="grid grid-cols-[28px_minmax(0,1fr)_auto] items-center gap-3 sm:gap-4"
            data-testid={`row-artist-${a.artistId}`}
          >
            <span className="font-mono text-xs text-muted-foreground tabular-nums">
              {String(idx + 1).padStart(2, "0")}
            </span>
            <div className="min-w-0">
              <p
                className="text-sm font-medium truncate"
                title={a.artistName}
                data-testid={`text-artist-name-${a.artistId}`}
              >
                {a.artistName}
              </p>
              <div
                className="mt-1.5 h-1.5 rounded-full bg-muted overflow-hidden"
                role="img"
                aria-label={`${a.artistName}: ${display}`}
              >
                <div
                  className="h-full bg-primary"
                  style={{ width: `${Math.max(2, pct)}%` }}
                />
              </div>
            </div>
            <span
              className="text-sm tabular-nums text-foreground shrink-0"
              data-testid={`text-artist-value-${a.artistId}`}
            >
              {display}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function LoadingState() {
  return (
    <div className="space-y-12">
      <Skeleton className="h-8 w-56" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-border/60 bg-card p-5 space-y-2"
          >
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-7 w-16" />
            <Skeleton className="h-3 w-28" />
          </div>
        ))}
      </div>
      <div className="rounded-2xl border border-border/60 bg-card p-8 space-y-4">
        <Skeleton className="h-5 w-48" />
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-6 w-full" />
        ))}
      </div>
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
