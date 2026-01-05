"use client";

import { useEffect, useRef } from "react";

interface SelectionBoxProps {
  startPos: { x: number; y: number } | null;
  currentPos: { x: number; y: number } | null;
  containerRef: React.RefObject<HTMLElement>;
  isActive: boolean;
}

export function SelectionBox({
  startPos,
  currentPos,
  containerRef,
  isActive,
}: SelectionBoxProps) {
  const selectionBoxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isActive || !startPos || !currentPos || !containerRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const startX = startPos.x - containerRect.left;
    const startY = startPos.y - containerRect.top;
    const currentX = currentPos.x - containerRect.left;
    const currentY = currentPos.y - containerRect.top;

    const left = Math.min(startX, currentX);
    const top = Math.min(startY, currentY);
    const width = Math.abs(currentX - startX);
    const height = Math.abs(currentY - startY);

    if (selectionBoxRef.current) {
      selectionBoxRef.current.style.left = `${left}px`;
      selectionBoxRef.current.style.top = `${top}px`;
      selectionBoxRef.current.style.width = `${width}px`;
      selectionBoxRef.current.style.height = `${height}px`;
    }
  }, [startPos, currentPos, isActive, containerRef]);

  if (!isActive || !startPos || !currentPos) return null;

  return (
    <div
      ref={selectionBoxRef}
      className="border-foreground/50 bg-foreground/5 pointer-events-none absolute z-50 border"
    />
  );
}
