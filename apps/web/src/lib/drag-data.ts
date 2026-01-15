import type { TimelineDragData } from "@/types/drag";

const MIME_TYPE = "application/x-timeline-drag";

export function setDragData({
  dataTransfer,
  dragData,
}: {
  dataTransfer: DataTransfer;
  dragData: TimelineDragData;
}): void {
  dataTransfer.setData(MIME_TYPE, JSON.stringify(dragData));
}

export function getDragData({
  dataTransfer,
}: {
  dataTransfer: DataTransfer;
}): TimelineDragData | null {
  const data = dataTransfer.getData(MIME_TYPE);
  return data ? (JSON.parse(data) as TimelineDragData) : null;
}

export function hasDragData({
  dataTransfer,
}: {
  dataTransfer: DataTransfer;
}): boolean {
  return dataTransfer.types.includes(MIME_TYPE);
}
