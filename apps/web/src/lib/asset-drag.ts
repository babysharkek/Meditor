import type { AssetDragData } from "@/types/assets";

const MIME_TYPE = "application/x-asset-drag";

export function setAssetDragData({
  dataTransfer,
  dragData,
}: {
  dataTransfer: DataTransfer;
  dragData: AssetDragData;
}): void {
  dataTransfer.setData(MIME_TYPE, JSON.stringify(dragData));
}

export function getAssetDragData({
  dataTransfer,
}: {
  dataTransfer: DataTransfer;
}): AssetDragData | null {
  const data = dataTransfer.getData(MIME_TYPE);
  return data ? (JSON.parse(data) as AssetDragData) : null;
}

export function hasAssetDragData({
  dataTransfer,
}: {
  dataTransfer: DataTransfer;
}): boolean {
  return dataTransfer.types.includes(MIME_TYPE);
}
