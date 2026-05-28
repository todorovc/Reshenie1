import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Mail, Globe2, Crown, Users, Music2 } from "lucide-react";
import { SiSpotify } from "react-icons/si";
import type { AppConfig, UserProfile } from "@shared/schema";

export default function Profile() {
  const [, setLocation] = useLocation();

  const { data: config } = useQuery<AppConfig | null>({
    queryKey: ["/api/auth/status"],
  });

  const { data: profile, isLoading, isError } = useQuery<UserProfile | null>({
    queryKey: ["/api/profile"],
    enabled: !!config && config.authStatus !== "unauthenticated",
  });

  if (!config) return <LoadingState />;

  if (config.authStatus === "unauthenticated") {
    return (
      <EmptyState
        title="No diary yet"
        body="Sign in with Spotify or try the demo to start a diary."
        actionLabel="Go to home"
        onAction={() => setLocation("/")}
      />
    );
  }

  if (isLoading) return <LoadingState />;

  if (isError || !profile) {
    return (
      <EmptyState
        title="We couldn't load your profile"
        body="There was a problem reaching Spotify. Please try again in a moment."
        actionLabel="Back to home"
        onAction={() => setLocation("/")}
      />
    );
  }

  const initials = profile.displayName
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="space-y-10">
      <header>
        <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
          Profile
        </p>
        <h1 className="mt-2 font-display text-2xl sm:text-3xl tracking-tight">
          The diarist
        </h1>
      </header>

      <section className="rounded-2xl border border-border/60 bg-card overflow-hidden">
        <div className="px-6 sm:px-8 py-8 sm:py-10 flex flex-col sm:flex-row items-start sm:items-center gap-6">
          <Avatar
            className="h-20 w-20 sm:h-24 sm:w-24 border border-border/60"
            data-testid="img-avatar"
          >
            {profile.imageUrl ? (
              <AvatarImage
                src={profile.imageUrl}
                alt={`${profile.displayName} profile photo`}
              />
            ) : null}
            <AvatarFallback className="bg-muted text-base font-medium">
              {initials || "·"}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2
                className="font-display text-xl sm:text-2xl tracking-tight"
                data-testid="text-display-name"
              >
                {profile.displayName}
              </h2>
              {profile.source === "spotify" ? (
                <Badge
                  variant="outline"
                  className="gap-1.5 border-primary/30 text-primary"
                  data-testid="status-source"
                >
                  <SiSpotify className="h-3 w-3" />
                  Spotify
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="gap-1.5 border-amber-500/40 text-amber-700 dark:text-amber-300"
                  data-testid="status-source"
                >
                  Demo
                </Badge>
              )}
            </div>
            {profile.email && (
              <p
                className="mt-1.5 inline-flex items-center gap-1.5 text-sm text-muted-foreground"
                data-testid="text-email"
              >
                <Mail className="h-3.5 w-3.5" />
                {profile.email}
              </p>
            )}
            <p className="mt-3 text-sm text-muted-foreground max-w-xl">
              {profile.source === "demo"
                ? "You're exploring the demo experience. Connect Spotify to write a diary from your own listening."
                : "Welcome back. Below is what Spotify knows about your account."}
            </p>
          </div>

          <div className="hidden sm:block">
            <Button variant="outline" asChild>
              <a href="#/history" data-testid="link-go-history">
                <Music2 className="h-4 w-4 mr-1.5" />
                Recent plays
              </a>
            </Button>
          </div>
        </div>

        <dl className="grid grid-cols-2 sm:grid-cols-4 border-t border-border/60 divide-x divide-border/60">
          <Stat
            label="Country"
            value={profile.country || "—"}
            icon={<Globe2 className="h-3.5 w-3.5" />}
            testId="stat-country"
          />
          <Stat
            label="Plan"
            value={profile.product || "—"}
            icon={<Crown className="h-3.5 w-3.5" />}
            testId="stat-plan"
          />
          <Stat
            label="Followers"
            value={
              profile.followers != null
                ? profile.followers.toLocaleString()
                : "—"
            }
            icon={<Users className="h-3.5 w-3.5" />}
            testId="stat-followers"
          />
          <Stat
            label="User ID"
            value={profile.id}
            icon={<Music2 className="h-3.5 w-3.5" />}
            mono
            testId="stat-id"
          />
        </dl>
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  icon,
  mono,
  testId,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  mono?: boolean;
  testId?: string;
}) {
  return (
    <div className="px-5 sm:px-6 py-4">
      <dt className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </dt>
      <dd
        className={`mt-1.5 text-sm sm:text-base text-foreground truncate ${
          mono ? "font-mono text-xs" : ""
        }`}
        data-testid={testId}
        title={value}
      >
        {value}
      </dd>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="space-y-10">
      <Skeleton className="h-8 w-40" />
      <div className="rounded-2xl border border-border/60 bg-card overflow-hidden">
        <div className="px-6 sm:px-8 py-8 sm:py-10 flex items-center gap-6">
          <Skeleton className="h-20 w-20 rounded-full" />
          <div className="space-y-3 flex-1">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 border-t border-border/60 divide-x divide-border/60">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="px-5 sm:px-6 py-4 space-y-2">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-4 w-24" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function EmptyState({
  title,
  body,
  actionLabel,
  onAction,
}: {
  title: string;
  body: string;
  actionLabel: string;
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
          {actionLabel}
        </Button>
      </div>
    </div>
  );
}
