import { useEffect, useRef, useState } from "react";
import { pathTo, shotProfile, type Snapshot } from "@/domain/badminton";
import { previousPlayers, rallyFrame } from "@/domain/playback";

export type PlayMode = "idle" | "one" | "all";
export type RallyPose = ReturnType<typeof rallyFrame>;

export function useRallyPlayback(args: {
  playing: boolean;
  mode: PlayMode;
  snapshots: Snapshot[];
  rallyId: string;
  pathEndId: string | null;
  reduced: boolean;
  durationScale: number;
  onAdvance: (id: string) => void;
  onStop: () => void;
}): RallyPose | null {
  const onAdvance = useRef(args.onAdvance);
  const onStop = useRef(args.onStop);
  onAdvance.current = args.onAdvance;
  onStop.current = args.onStop;
  const [pose, setPose] = useState<RallyPose | null>(null);

  useEffect(() => {
    if (!args.playing || args.snapshots.length === 0) {
      setPose(null);
      return;
    }
    const path = args.mode === "all"
      ? pathTo(args.snapshots, args.pathEndId ?? args.rallyId)
      : args.snapshots.filter((item) => item.id === args.rallyId);
    const current = path.find((item) => item.id === args.rallyId) ?? path[0];
    if (!current) return;
    const previous = previousPlayers(args.snapshots, current);
    let frame = 0;
    let timer = 0;
    const finish = () => {
      if (args.mode === "all") {
        const step = path.findIndex((item) => item.id === current.id);
        const next = path[step + 1];
        if (next) {
          onAdvance.current(next.id);
          return;
        }
      }
      onStop.current();
    };

    if (args.reduced) {
      setPose(rallyFrame({ previous, current, t: 1 }));
      timer = window.setTimeout(finish, args.mode === "all" ? 650 : 0);
      return () => window.clearTimeout(timer);
    }

    const duration = shotProfile(current.shot.type).durationMs * args.durationScale;
    const started = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - started) / duration);
      setPose(rallyFrame({ previous, current, t }));
      if (t < 1) frame = requestAnimationFrame(tick);
      else timer = window.setTimeout(finish, 260);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, [args.durationScale, args.mode, args.pathEndId, args.playing, args.rallyId, args.reduced, args.snapshots]);

  return pose;
}
