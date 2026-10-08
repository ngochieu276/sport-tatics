import { useId, useRef, type PointerEvent, type KeyboardEvent } from "react";
import {
  applyCoverHandle,
  clampPlayer,
  clampTarget,
  contains,
  courtSegments,
  halfOf,
  shotProfile,
  SLOT_LABELS,
  targetBounds,
  type Bounds,
  type CoverArea,
  type CoverHandle,
  type Format,
  type PlayerSlot,
  type PlayerState,
  type Point,
  type Shot,
} from "@/domain/badminton";
import { shuttleControl, shuttlePoint } from "@/domain/playback";

const DRAW_W = 610;
const DRAW_H = 1340;

type Drag =
  | { kind: "player"; id: PlayerSlot }
  | { kind: "target" }
  | { kind: "cover"; id: string; handle: CoverHandle; origin: Point; bounds: Bounds };

type BadmintonCourtProps = {
  format: Format;
  players: PlayerState[];
  shot: Shot;
  coverAreas: CoverArea[];
  selectedCoverId: string | null;
  selectedId: PlayerSlot | null;
  interactive: boolean;
  shuttle: Point | null;
  showArrow: boolean;
  onSelect: (id: PlayerSlot) => void;
  onSelectCover: (id: string) => void;
  onMovePlayer: (id: PlayerSlot, point: Point) => void;
  onMoveTarget: (point: Point) => void;
  onMoveCoverArea: (id: string, area: Bounds) => void;
  onDeleteCoverArea: (id: string) => void;
};

function toSvg(point: Point): Point {
  return { x: point.x * DRAW_W, y: (1 - point.y) * DRAW_H };
}

function fromSvg(svg: SVGSVGElement, clientX: number, clientY: number): Point | null {
  const matrix = svg.getScreenCTM();
  if (!matrix) return null;
  const local = new DOMPoint(clientX, clientY).matrixTransform(matrix.inverse());
  return { x: local.x / DRAW_W, y: 1 - local.y / DRAW_H };
}

function curve(from: Point, to: Point, arc: number): string {
  const control = toSvg(shuttleControl(from, to, arc));
  const start = toSvg(from);
  const end = toSvg(to);
  return `M ${start.x} ${start.y} Q ${control.x} ${control.y} ${end.x} ${end.y}`;
}

const COVER_HANDLES: { handle: Exclude<CoverHandle, "move">; cursor: string }[] = [
  { handle: "x0y1", cursor: "nwse-resize" },
  { handle: "y1", cursor: "ns-resize" },
  { handle: "x1y1", cursor: "nesw-resize" },
  { handle: "x1", cursor: "ew-resize" },
  { handle: "x1y0", cursor: "nwse-resize" },
  { handle: "y0", cursor: "ns-resize" },
  { handle: "x0y0", cursor: "nesw-resize" },
  { handle: "x0", cursor: "ew-resize" },
];

export function BadmintonCourt({
  format,
  players,
  shot,
  coverAreas,
  selectedCoverId,
  selectedId,
  interactive,
  shuttle,
  showArrow,
  onSelect,
  onSelectCover,
  onMovePlayer,
  onMoveTarget,
  onMoveCoverArea,
  onDeleteCoverArea,
}: BadmintonCourtProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<Drag | null>(null);
  const markerId = `shot-${useId().replace(/:/g, "")}`;
  const hitter = players.find((player) => player.id === shot.hitterId) ?? players[0];

  function pointFrom(event: { clientX: number; clientY: number }): Point | null {
    return svgRef.current ? fromSvg(svgRef.current, event.clientX, event.clientY) : null;
  }

  function moveDrag(event: { clientX: number; clientY: number }) {
    const current = drag.current;
    const point = pointFrom(event);
    if (!current || !point) return;
    if (current.kind === "player") {
      onMovePlayer(current.id, clampPlayer(format, current.id, point));
      return;
    }
    if (current.kind === "cover") {
      onMoveCoverArea(current.id, applyCoverHandle(format, current.bounds, current.handle, current.origin, point));
      return;
    }
    onMoveTarget(clampTarget(format, shot.hitterId, point));
  }

  function begin(event: PointerEvent<SVGElement>, next: Drag) {
    if (!interactive || !svgRef.current) return;
    event.stopPropagation();
    svgRef.current.setPointerCapture(event.pointerId);
    drag.current = next;
    if (next.kind === "player") onSelect(next.id);
    if (next.kind === "cover") onSelectCover(next.id);
    if (next.kind !== "player") moveDrag(event);
  }

  function onCourtPointerDown(event: PointerEvent<SVGSVGElement>) {
    if (!interactive) return;
    const target = event.target as Element;
    if (target.closest("[data-player], [data-target], [data-cover]")) return;
    const point = pointFrom(event);
    if (!point || !contains(targetBounds(format, shot.hitterId), point)) return;
    begin(event, { kind: "target" });
  }

  function onKeyDown(event: KeyboardEvent<SVGSVGElement>) {
    if (!interactive || !selectedId) return;
    const step = event.shiftKey ? 0.04 : 0.012;
    const deltas: Record<string, Point> = {
      ArrowLeft: { x: -step, y: 0 },
      ArrowRight: { x: step, y: 0 },
      ArrowUp: { x: 0, y: step },
      ArrowDown: { x: 0, y: -step },
    };
    const delta = deltas[event.key];
    if (!delta) return;
    const player = players.find((item) => item.id === selectedId);
    if (!player) return;
    event.preventDefault();
    onMovePlayer(selectedId, clampPlayer(format, selectedId, {
      x: player.x + delta.x,
      y: player.y + delta.y,
    }));
  }

  const shuttleSvg = shuttle ? toSvg(shuttle) : null;
  const targetSvg = toSvg(shot.target);
  const profile = shotProfile(shot.type);
  const curlLabel = hitter ? toSvg(shuttlePoint(hitter, shot.target, profile.arc, 0.5)) : null;
  const labelWidth = Math.max(84, profile.label.length * 12 + 28);

  return (
    <svg
      ref={svgRef}
      viewBox="-90 -50 790 1440"
      preserveAspectRatio="xMidYMid meet"
      role="application"
      aria-label={`${format} badminton court`}
      tabIndex={0}
      className={`absolute inset-0 h-full w-full touch-none select-none ${interactive ? "cursor-crosshair" : ""}`}
      onPointerDown={onCourtPointerDown}
      onPointerMove={(event) => {
        if (drag.current) moveDrag(event);
      }}
      onPointerUp={() => {
        drag.current = null;
      }}
      onPointerCancel={() => {
        drag.current = null;
      }}
      onKeyDown={onKeyDown}
    >
      <rect x={-36} y={-36} width={DRAW_W + 72} height={DRAW_H + 72} rx="22" fill="#123c28" />
      <rect x="0" y="0" width={DRAW_W} height={DRAW_H} fill="#1c7a4a" />
      {courtSegments(format).map((segment, index) => {
        const start = toSvg({ x: segment.x1, y: segment.y1 });
        const end = toSvg({ x: segment.x2, y: segment.y2 });
        const net = segment.kind === "net";
        return (
          <g key={`${segment.kind}-${index}`}>
            {net && (
              <line x1={start.x} y1={start.y} x2={end.x} y2={end.y} stroke="#0e3322" strokeWidth="14" />
            )}
            <line
              x1={start.x}
              y1={start.y}
              x2={end.x}
              y2={end.y}
              stroke="#f4fff8"
              strokeWidth={net ? 3 : segment.kind === "boundary" ? 4 : 2.5}
              strokeOpacity={segment.kind === "inner" ? 0.45 : 0.95}
              strokeDasharray={net ? "14 10" : undefined}
            />
          </g>
        );
      })}
      <text x={DRAW_W / 2} y={-12} textAnchor="middle" fill="#e7f6ee" fontSize="22" fontFamily="Outfit, sans-serif">
        Far
      </text>
      <text x={DRAW_W / 2} y={DRAW_H + 28} textAnchor="middle" fill="#e7f6ee" fontSize="22" fontFamily="Outfit, sans-serif">
        Near
      </text>
      {coverAreas.map((area) => (
        <CoverBox
          key={area.id}
          area={area}
          selected={area.id === selectedCoverId}
          interactive={interactive}
          onBegin={(event, handle) => {
            const point = pointFrom(event);
            if (!point) return;
            begin(event, { kind: "cover", id: area.id, handle, origin: point, bounds: area });
          }}
          onDelete={() => onDeleteCoverArea(area.id)}
        />
      ))}
      <defs>
        <marker id={markerId} markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L8,3 L0,6 Z" fill="#e2a51a" />
        </marker>
      </defs>
      {hitter && (
        <path
          d={curve(hitter, shot.target, profile.arc)}
          fill="none"
          stroke="#e2a51a"
          strokeWidth="5"
          markerEnd={showArrow ? `url(#${markerId})` : undefined}
        />
      )}
      {curlLabel && (
        <g transform={`translate(${curlLabel.x} ${curlLabel.y})`} style={{ pointerEvents: "none" }}>
          <rect
            x={-labelWidth / 2}
            y={-18}
            width={labelWidth}
            height={36}
            rx={18}
            fill="#172033"
          />
          <text
            textAnchor="middle"
            dy="7"
            fill="#f4fff8"
            fontSize="18"
            fontWeight="600"
            fontFamily="Outfit, sans-serif"
          >
            {profile.label}
          </text>
        </g>
      )}
      {shuttleSvg && (
        <g transform={`translate(${shuttleSvg.x} ${shuttleSvg.y})`} aria-label="Shuttlecock">
          <circle r="16" fill="#e2a51a" stroke="#172033" strokeWidth="3" />
          <circle cx="-4" cy="-4" r="4" fill="#fff4cc" />
        </g>
      )}
      <g
        data-target="true"
        transform={`translate(${targetSvg.x} ${targetSvg.y})`}
        className={interactive ? "cursor-grab" : ""}
        onPointerDown={(event) => begin(event, { kind: "target" })}
      >
        <circle r="16" fill="#e2a51a" stroke="#172033" strokeWidth="3" />
        <circle r="4" fill="#172033" />
        <title>Shuttlecock landing point</title>
      </g>
      {players.map((player) => {
        const position = toSvg(player);
        const hitterToken = player.id === shot.hitterId;
        const selected = player.id === selectedId;
        return (
          <g
            key={player.id}
            data-player={player.id}
            transform={`translate(${position.x} ${position.y})`}
            className={interactive ? "cursor-grab" : ""}
            onPointerDown={(event) => begin(event, { kind: "player", id: player.id })}
          >
            {selected && <circle r="32" fill="none" stroke="#ffffff" strokeWidth="3" />}
            <circle
              r="24"
              fill={halfOf(player.id) === "near" ? "#155e96" : "#9a3412"}
              stroke={hitterToken ? "#e2a51a" : "#f4fff8"}
              strokeWidth={hitterToken ? 5 : 3}
            />
            <text
              textAnchor="middle"
              dy="6"
              fill="#ffffff"
              fontSize="16"
              fontWeight="700"
              fontFamily="Outfit, sans-serif"
              style={{ pointerEvents: "none" }}
            >
              {SLOT_LABELS[player.id].short}
            </text>
            <title>{SLOT_LABELS[player.id].full}{hitterToken ? ", hitter" : ""}</title>
          </g>
        );
      })}
    </svg>
  );
}

function CoverBox({
  area,
  selected,
  interactive,
  onBegin,
  onDelete,
}: {
  area: CoverArea;
  selected: boolean;
  interactive: boolean;
  onBegin: (event: PointerEvent<SVGElement>, handle: CoverHandle) => void;
  onDelete: () => void;
}) {
  const left = area.x0 * DRAW_W;
  const right = area.x1 * DRAW_W;
  const top = (1 - area.y1) * DRAW_H;
  const bottom = (1 - area.y0) * DRAW_H;
  const width = right - left;
  const height = bottom - top;
  const midX = left + width / 2;
  const midY = top + height / 2;
  const handlePoints: Record<Exclude<CoverHandle, "move">, Point> = {
    x0y1: { x: left, y: top },
    y1: { x: midX, y: top },
    x1y1: { x: right, y: top },
    x1: { x: right, y: midY },
    x1y0: { x: right, y: bottom },
    y0: { x: midX, y: bottom },
    x0y0: { x: left, y: bottom },
    x0: { x: left, y: midY },
  };
  return (
    <g data-cover="true">
      <rect
        x={left}
        y={top}
        width={width}
        height={height}
        fill="#7dd3fc"
        fillOpacity={selected ? 0.34 : 0.22}
        stroke={selected ? "#0369a1" : "#38bdf8"}
        strokeWidth={selected ? 5 : 4}
        strokeDasharray="14 10"
        className={interactive ? "cursor-move" : ""}
        onPointerDown={(event) => onBegin(event, "move")}
      />
      <text
        x={midX}
        y={midY + 7}
        textAnchor="middle"
        fill="#082f49"
        fontSize="20"
        fontWeight="700"
        fontFamily="Outfit, sans-serif"
        style={{ pointerEvents: "none" }}
      >
        Cover
      </text>
      {interactive && selected && COVER_HANDLES.map(({ handle, cursor }) => {
        const point = handlePoints[handle];
        return (
          <rect
            key={handle}
            x={point.x - 12}
            y={point.y - 12}
            width="24"
            height="24"
            rx="4"
            fill="#f8fbff"
            stroke="#082f49"
            strokeWidth="3"
            style={{ cursor }}
            onPointerDown={(event) => onBegin(event, handle)}
          />
        );
      })}
      {interactive && selected && (
        <g
          transform={`translate(${right} ${top})`}
          className="cursor-pointer"
          onPointerDown={(event) => {
            event.stopPropagation();
            onDelete();
          }}
        >
          <circle r="16" fill="#9a3412" stroke="#f4fff8" strokeWidth="3" />
          <text textAnchor="middle" dy="6" fill="#fff" fontSize="18" fontWeight="700" style={{ pointerEvents: "none" }}>×</text>
          <title>Delete cover area</title>
        </g>
      )}
    </g>
  );
}
