import { Link, useLocation } from "wouter";
import { Moon, Sun, LogOut } from "lucide-react";
import { Logo } from "./Logo";
import { useTheme } from "./ThemeProvider";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { AppConfig } from "@shared/schema";
import { cn } from "@/lib/utils";

const NAV_ITEMS: Array<{ href: string; label: string }> = [
  { href: "/", label: "Home" },
  { href: "/profile", label: "Profile" },
  { href: "/history", label: "Listening history" },
  { href: "/insights", label: "Insights" },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const { theme, toggleTheme } = useTheme();
  const [location] = useLocation();

  const { data: config } = useQuery<AppConfig | null>({
    queryKey: ["/api/auth/status"],
  });

  const authStatus = config?.authStatus ?? "unauthenticated";

  const logout = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/auth/logout");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
      queryClient.invalidateQueries({ queryKey: ["/api/listening-history"] });
      queryClient.invalidateQueries({ queryKey: ["/api/insights"] });
    },
  });

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex h-14 items-center justify-between gap-4">
            <Link href="/" data-testid="link-home">
              <a className="rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background">
                <Logo size={26} />
              </a>
            </Link>

            <nav
              aria-label="Primary"
              className="hidden md:flex items-center gap-1"
            >
              {NAV_ITEMS.map((item) => {
                const active =
                  item.href === "/"
                    ? location === "/"
                    : location.startsWith(item.href);
                return (
                  <Link key={item.href} href={item.href}>
                    <a
                      data-testid={`link-nav-${item.href.replace("/", "") || "home"}`}
                      className={cn(
                        "px-3 py-1.5 rounded-md text-sm transition-colors hover-elevate",
                        active
                          ? "text-foreground font-medium"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                      aria-current={active ? "page" : undefined}
                    >
                      {item.label}
                    </a>
                  </Link>
                );
              })}
            </nav>

            <div className="flex items-center gap-1.5">
              {authStatus !== "unauthenticated" && (
                <span
                  className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/40 px-2.5 py-1 text-xs text-muted-foreground"
                  data-testid="status-auth"
                >
                  <span
                    className={cn(
                      "h-1.5 w-1.5 rounded-full",
                      authStatus === "spotify"
                        ? "bg-primary"
                        : "bg-amber-500/80",
                    )}
                  />
                  {authStatus === "spotify" ? "Spotify" : "Demo mode"}
                </span>
              )}

              <Button
                variant="ghost"
                size="icon"
                aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
                onClick={toggleTheme}
                data-testid="button-toggle-theme"
              >
                {theme === "dark" ? (
                  <Sun className="h-4 w-4" />
                ) : (
                  <Moon className="h-4 w-4" />
                )}
              </Button>

              {authStatus !== "unauthenticated" && (
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Sign out"
                  onClick={() => logout.mutate()}
                  disabled={logout.isPending}
                  data-testid="button-logout"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Mobile nav */}
          <nav
            aria-label="Primary mobile"
            className="md:hidden flex items-center gap-1 overflow-x-auto pb-2 -mx-1 px-1"
          >
            {NAV_ITEMS.map((item) => {
              const active =
                item.href === "/"
                  ? location === "/"
                  : location.startsWith(item.href);
              return (
                <Link key={item.href} href={item.href}>
                  <a
                    className={cn(
                      "px-2.5 py-1 rounded-md text-xs whitespace-nowrap transition-colors hover-elevate",
                      active
                        ? "text-foreground font-medium"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                    aria-current={active ? "page" : undefined}
                  >
                    {item.label}
                  </a>
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8 sm:py-12">
          {children}
        </div>
      </main>

      <footer className="border-t border-border/60">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
          <span>
            EchoDiary · a quiet record of your listening
          </span>
          <span>
            Powered by Spotify Web API
          </span>
        </div>
      </footer>
    </div>
  );
}
