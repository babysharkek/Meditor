export interface TCanvasSize {
  width: number;
  height: number;
}

export interface TTextElementDragState {
  isDragging: boolean;
  elementId: string | null;
  trackId: string | null;
  startX: number;
  startY: number;
  initialElementX: number;
  initialElementY: number;
  currentX: number;
  currentY: number;
  elementWidth: number;
  elementHeight: number;
}

export type TPlatformLayout = "tiktok";
