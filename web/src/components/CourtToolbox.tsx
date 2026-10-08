import { MAX_COVER_AREAS } from "@/domain/badminton";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "./forms";

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
      <SectionHeading>Tools</SectionHeading>
      <Button type="button" variant="outline" size="sm" className="rounded-full" disabled={disabled || coverCount >= MAX_COVER_AREAS} onClick={onAddCoverArea}>
        Add cover area
      </Button>
      <Button type="button" variant="destructive" size="sm" className="rounded-full" disabled={disabled || !selectedCoverId} onClick={onDeleteCoverArea}>
        Delete cover area
      </Button>
    </div>
  );
}
