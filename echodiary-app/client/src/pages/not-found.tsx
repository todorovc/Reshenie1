import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Compass } from "lucide-react";

export default function NotFound() {
  const [, setLocation] = useLocation();
  return (
    <div className="rounded-2xl border border-border/60 bg-card px-6 py-16 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-border/60 bg-background/60 text-muted-foreground">
        <Compass className="h-5 w-5" />
      </div>
      <h1 className="mt-5 font-display text-2xl tracking-tight">
        That page isn't in the diary
      </h1>
      <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
        The address you followed doesn't match a page in EchoDiary. Try one of
        the routes below.
      </p>
      <div className="mt-6 flex justify-center gap-2">
        <Button onClick={() => setLocation("/")} data-testid="button-home">
          Home
        </Button>
        <Button
          variant="outline"
          onClick={() => setLocation("/history")}
          data-testid="button-history"
        >
          Listening history
        </Button>
      </div>
    </div>
  );
}
