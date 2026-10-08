import { useState } from "react";
import { ListTree, Play, Square } from "lucide-react";
import { pathContaining, pathShotLabel, rallyPaths, type Snapshot } from "@/domain/badminton";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

type MobilePathBarProps = {
  snapshots: Snapshot[];
  rallyId: string;
  pathEndId: string | null;
  playing: boolean;
  onPlayPath: (endId: string) => void;
  onStop: () => void;
};

export function MobilePathBar({
  snapshots,
  rallyId,
  pathEndId,
  playing,
  onPlayPath,
  onStop,
}: MobilePathBarProps) {
  const [open, setOpen] = useState(false);
  const paths = rallyPaths(snapshots);
  const currentPath = pathContaining(snapshots, pathEndId ?? rallyId);
  const leafId = currentPath[currentPath.length - 1]?.id;
  const branched = paths.length > 1;

  function play(endId: string) {
    setOpen(false);
    onPlayPath(endId);
  }

  return (
    <section className="flex shrink-0 flex-col gap-2 border-t border-border bg-card/90 px-3 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:hidden">
      {branched && currentPath.length > 0 && (
        <p className="truncate text-xs text-muted-foreground">
          {pathShotLabel(currentPath)}
        </p>
      )}
      <div className="flex gap-2">
        {playing ? (
          <Button type="button" size="lg" className="h-11 min-h-11 flex-1 rounded-full" onClick={onStop}>
            <Square className="size-4 fill-current" />
            Stop
          </Button>
        ) : (
          <Button
            type="button"
            size="lg"
            className="h-11 min-h-11 flex-1 rounded-full"
            disabled={!leafId}
            onClick={() => leafId && play(leafId)}
          >
            <Play className="size-4 fill-current" />
            Play path
          </Button>
        )}
        {branched && (
          <Button
            type="button"
            size="lg"
            variant="outline"
            className="h-11 min-h-11 rounded-full px-4"
            disabled={playing}
            onClick={() => setOpen(true)}
          >
            <ListTree className="size-4" />
            Paths
          </Button>
        )}
      </div>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="max-h-[75vh] gap-0 rounded-t-2xl">
          <SheetHeader>
            <SheetTitle>Choose a path</SheetTitle>
            <SheetDescription>
              Each path is one full rally line. Tap it to play from the opening shot.
            </SheetDescription>
          </SheetHeader>
          <div className="flex flex-col gap-2 overflow-y-auto px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            {paths.map((path, index) => {
              const endId = path[path.length - 1]?.id;
              if (!endId) return null;
              const selected = endId === leafId;
              return (
                <Button
                  key={endId}
                  type="button"
                  variant={selected ? "default" : "outline"}
                  className={cn(
                    "h-auto min-h-14 w-full flex-col items-start gap-0.5 whitespace-normal rounded-xl px-4 py-3 text-left",
                    selected && "bg-apron text-line hover:bg-apron/90",
                  )}
                  onClick={() => play(endId)}
                >
                  <span className={cn("text-xs", selected ? "text-line/80" : "text-muted-foreground")}>
                    Path {index + 1} · {path.length} {path.length === 1 ? "shot" : "shots"}
                  </span>
                  <span className="text-sm font-medium">{pathShotLabel(path)}</span>
                </Button>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>
    </section>
  );
}
