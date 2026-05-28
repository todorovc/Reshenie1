import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { SiSpotify } from "react-icons/si";
import { Sparkles, ArrowRight, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { AppConfig } from "@shared/schema";

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  not_configured:
    "Spotify isn't configured on this server yet. You can still try the demo experience.",
  state_mismatch:
    "The login state didn't match. For your safety we cancelled the request — please try again.",
  exchange_failed:
    "Spotify accepted the login but the token exchange failed. Check the server logs.",
  missing_params: "Spotify didn't return the expected parameters.",
  access_denied: "You declined the permissions. Nothing was changed.",
};

export default function Home() {
  const [, setLocation] = useLocation();
  const [authError, setAuthError] = useState<string | null>(null);

  const { data: config } = useQuery<AppConfig | null>({
    queryKey: ["/api/auth/status"],
  });

  // Surface ?auth_error= from /auth/login redirects.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const err = params.get("auth_error");
    if (err) {
      setAuthError(err);
      // Clean the URL so refreshes don't keep showing it.
      window.history.replaceState(
        null,
        "",
        window.location.pathname + (window.location.hash || "#/"),
      );
    }
  }, []);

  const demoLogin = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/demo-login");
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["/api/auth/status"],
      });
      setLocation("/profile");
    },
  });

  const spotifyConfigured = config?.spotifyConfigured ?? false;
  const isAuthed =
    config?.authStatus && config.authStatus !== "unauthenticated";

  return (
    <div className="space-y-16">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl border border-border/60 bg-card grain">
        <div className="relative px-6 sm:px-10 py-12 sm:py-16">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/60 px-3 py-1 text-xs text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <span>Your music, written down</span>
            </div>
            <h1
              className="mt-5 font-display text-3xl sm:text-4xl lg:text-[2.6rem] leading-[1.05] tracking-tight"
              data-testid="text-hero-title"
            >
              A quiet diary for the songs you keep returning to.
            </h1>
            <p className="mt-4 text-sm sm:text-base text-muted-foreground max-w-xl leading-relaxed">
              EchoDiary reads your recent Spotify plays and turns them into
              something you can sit with — a daily record of what played, who
              you reached for, and how your taste drifts through the week.
            </p>

            <div className="mt-7 flex flex-col sm:flex-row gap-3">
              {isAuthed ? (
                <Button
                  size="lg"
                  onClick={() => setLocation("/profile")}
                  data-testid="button-open-diary"
                >
                  Open your diary
                  <ArrowRight className="ml-1.5 h-4 w-4" />
                </Button>
              ) : spotifyConfigured ? (
                <Button
                  size="lg"
                  asChild
                  data-testid="button-spotify-login"
                >
                  <a href="/auth/login">
                    <SiSpotify className="mr-1.5 h-4 w-4" />
                    Sign in with Spotify
                  </a>
                </Button>
              ) : (
                <Button
                  size="lg"
                  onClick={() => demoLogin.mutate()}
                  disabled={demoLogin.isPending}
                  data-testid="button-demo"
                >
                  <Sparkles className="mr-1.5 h-4 w-4" />
                  {demoLogin.isPending ? "Loading\u2026" : "Try the demo experience"}
                </Button>
              )}

              {!isAuthed && spotifyConfigured && (
                <Button
                  variant="ghost"
                  size="lg"
                  onClick={() => demoLogin.mutate()}
                  disabled={demoLogin.isPending}
                  data-testid="button-demo-secondary"
                >
                  Or try the demo
                </Button>
              )}
            </div>

            {authError && (
              <div
                role="alert"
                className="mt-5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-300"
                data-testid="text-auth-error"
              >
                {AUTH_ERROR_MESSAGES[authError] ||
                  `Sign-in didn't complete (${authError}).`}
              </div>
            )}
          </div>

          {/* Right-side decorative waveform card */}
          <div className="pointer-events-none absolute inset-y-0 right-0 hidden lg:flex items-center pr-10 opacity-90">
            <WaveformDecoration />
          </div>
        </div>
      </section>

      {/* Three short value props */}
      <section className="grid gap-6 md:grid-cols-3">
        <ValueCard
          eyebrow="01"
          title="A daily record"
          body="Recent plays are grouped by day so you can revisit a weekend, a commute, or a long night."
        />
        <ValueCard
          eyebrow="02"
          title="Quiet insights"
          body="See who you reached for the most, how much time you spent listening, and the share of songs you marked liked."
        />
        <ValueCard
          eyebrow="03"
          title="Yours alone"
          body="Tokens stay on the server. Your listening history never lands in the browser's storage."
        />
      </section>

      {/* Privacy / setup notice */}
      <section className="rounded-xl border border-border/60 bg-card/60 px-6 py-5">
        <div className="flex items-start gap-3">
          <ShieldCheck className="h-5 w-5 text-primary mt-0.5 shrink-0" />
          <div className="text-sm text-muted-foreground leading-relaxed">
            <p className="text-foreground font-medium mb-1">
              Server-backed Spotify OAuth (PKCE)
            </p>
            <p>
              EchoDiary uses Spotify's Authorization Code with PKCE flow.
              Access and refresh tokens are stored in an HTTP-only session on
              the server and never touch{" "}
              <code className="font-mono text-xs">localStorage</code>,{" "}
              <code className="font-mono text-xs">sessionStorage</code>, or
              the frontend bundle. The demo experience uses fully synthetic
              data and works without any Spotify credentials.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

function ValueCard({
  eyebrow,
  title,
  body,
}: {
  eyebrow: string;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-6">
      <div className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
        {eyebrow}
      </div>
      <h3 className="mt-3 font-display text-lg leading-tight tracking-tight">
        {title}
      </h3>
      <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
        {body}
      </p>
    </div>
  );
}

function WaveformDecoration() {
  const bars = Array.from({ length: 28 }, (_, i) => {
    // Smooth sine-like silhouette
    const t = (i / 27) * Math.PI * 2;
    const h = 14 + Math.abs(Math.sin(t + 0.6)) * 70;
    return { i, h };
  });
  return (
    <svg
      width="320"
      height="200"
      viewBox="0 0 320 200"
      aria-hidden="true"
      className="text-primary"
    >
      <g>
        {bars.map(({ i, h }) => (
          <rect
            key={i}
            x={i * 11}
            y={100 - h / 2}
            width="4"
            height={h}
            rx="2"
            fill="currentColor"
            opacity={0.18 + (i % 4) * 0.06}
          />
        ))}
      </g>
    </svg>
  );
}
