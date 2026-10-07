import { useEffect, useRef, useState } from "react";
import { shotProfile, type Format, type Snapshot } from "@/domain/badminton";
import { previousPlayers, rallyFrame } from "@/domain/playback";

export type PlayMode = "idle" | "one" | "all";
export type RallyPose = ReturnType<typeof rallyFrame>;

export function useRallyPlayback(args: {
  playing: boolean;
  mode: PlayMode;
  format: Format;
  snapshots: Snapshot[];
  index: number;
  reduced: boolean;
  durationScale: number;
  onAdvance: (index: number) => void;
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
    const current = args.snapshots[args.index];
    if (!current) return;
    const previous = previousPlayers(args.format, args.snapshots, args.index);
    let frame = 0;
    let timer = 0;
    const finish = () => {
      if (args.mode === "all" && args.index < args.snapshots.length - 1) onAdvance.current(args.index + 1);
      else onStop.current();
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
  }, [args.durationScale, args.format, args.index, args.mode, args.playing, args.reduced, args.snapshots]);

  return pose;
}
