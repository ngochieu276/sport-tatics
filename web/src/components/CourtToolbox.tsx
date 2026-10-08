import { MAX_COVER_AREAS } from "@/domain/badminton";

type CourtToolboxProps = {
  disabled: boolean;
  coverCount: number;
  selectedCoverId: string | null;
  onAddCoverArea: () => void;
  onDeleteCoverArea: () => void;
};

export function CourtToolbox({
  disabled,
  coverCount,
  selectedCoverId,
  onAddCoverArea,
  onDeleteCoverArea,
}: CourtToolboxProps) {
  return (
    <div className="mb-2 flex flex-wrap items-center gap-2" role="toolbar" aria-label="Court tools">
      <span className="text-xs font-semibold tracking-[0.16em] text-ink/50 uppercase">Tools</span>
      <button
        type="button"
        disabled={disabled || coverCount >= MAX_COVER_AREAS}
        onClick={onAddCoverArea}
        className="rounded-full bg-white px-3 py-1.5 text-sm ring-1 ring-ink/15 disabled:opacity-40"
      >
        Add cover area
      </button>
      <button
        type="button"
        disabled={disabled || !selectedCoverId}
        onClick={onDeleteCoverArea}
        className="rounded-full bg-white px-3 py-1.5 text-sm text-far ring-1 ring-ink/15 disabled:opacity-40"
      >
        Delete cover area
      </button>
    </div>
  );
}
