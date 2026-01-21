import { getDropLineY } from "@/lib/timeline/drop-utils";
import type { TimelineTrack, DropTarget } from "@/types/timeline";

interface DragLineProps {
  dropTarget: DropTarget | null;
  tracks: TimelineTrack[];
  isVisible: boolean;
}

export function DragLine({ dropTarget, tracks, isVisible }: DragLineProps) {
  if (!isVisible || !dropTarget) return null;

  const y = getDropLineY({ dropTarget, tracks });

  return (
    <div
      className="bg-primary pointer-events-none absolute right-0 left-0 z-50 h-0.5"
      style={{ top: `${y}px` }}
    />
  );
}
