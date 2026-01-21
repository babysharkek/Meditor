"use client";

import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ReactNode, useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Plus } from "lucide-react";
import { cn } from "@/utils/ui";
import { useEditor } from "@/hooks/use-editor";
import { clearDragData, setDragData } from "@/lib/drag-data";
import type { TimelineDragData } from "@/types/drag";

export interface DraggableItemProps {
  name: string;
  preview: ReactNode;
  dragData: TimelineDragData;
  onDragStart?: ({ e }: { e: React.DragEvent }) => void;
  onAddToTimeline?: ({ currentTime }: { currentTime: number }) => void;
  aspectRatio?: number;
  className?: string;
  containerClassName?: string;
  shouldShowPlusOnDrag?: boolean;
  shouldShowLabel?: boolean;
  isRounded?: boolean;
  variant?: "card" | "compact";
  isDraggable?: boolean;
  isHighlighted?: boolean;
}

export function DraggableItem({
  name,
  preview,
  dragData,
  onDragStart,
  onAddToTimeline,
  aspectRatio = 16 / 9,
  className = "",
  containerClassName,
  shouldShowPlusOnDrag = true,
  shouldShowLabel = true,
  isRounded = true,
  variant = "card",
  isDraggable = true,
  isHighlighted = false,
}: DraggableItemProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 });
  const dragRef = useRef<HTMLDivElement>(null);
  const editor = useEditor();
  const highlightClassName = "ring-2 ring-primary rounded-sm bg-primary/10";

  const handleAddToTimeline = () => {
    onAddToTimeline?.({ currentTime: editor.playback.getCurrentTime() });
  };

  const emptyImg = new window.Image();
  emptyImg.src =
    "data:image/gif;base64,R0lGODlhAQABAIAAAAUEBAAAACwAAAAAAQABAAACAkQBADs=";

  useEffect(() => {
    if (!isDragging) return;

    const handleDragOver = (e: DragEvent) => {
      setDragPosition({ x: e.clientX, y: e.clientY });
    };

    document.addEventListener("dragover", handleDragOver);

    return () => {
      document.removeEventListener("dragover", handleDragOver);
    };
  }, [isDragging]);

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setDragImage(emptyImg, 0, 0);

    setDragData({ dataTransfer: e.dataTransfer, dragData });
    e.dataTransfer.effectAllowed = "copy";

    setDragPosition({ x: e.clientX, y: e.clientY });
    setIsDragging(true);

    onDragStart?.({ e });
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    clearDragData();
  };

  return (
    <>
      {variant === "card" ? (
        <div
          ref={dragRef}
          className={cn("group relative", containerClassName ?? "size-28")}
        >
          <div
            className={cn(
              "relative flex h-auto w-full cursor-default flex-col gap-1 p-1",
              className,
              isHighlighted && highlightClassName,
            )}
          >
            <AspectRatio
              ratio={aspectRatio}
              className={cn(
                "bg-panel-accent relative overflow-hidden",
                isRounded && "rounded-md",
                isDraggable && "[&::-webkit-drag-ghost]:opacity-0",
              )}
              draggable={isDraggable}
              onDragStart={isDraggable ? handleDragStart : undefined}
              onDragEnd={isDraggable ? handleDragEnd : undefined}
            >
              {preview}
              {!isDragging && (
                <PlusButton
                  className="opacity-0 group-hover:opacity-100"
                  onClick={handleAddToTimeline}
                />
              )}
            </AspectRatio>
            {shouldShowLabel && (
              <span
                className="text-muted-foreground w-full truncate text-left text-[0.7rem]"
                aria-label={name}
                title={name}
              >
                {name.length > 8
                  ? `${name.slice(0, 16)}...${name.slice(-3)}`
                  : name}
              </span>
            )}
          </div>
        </div>
      ) : (
        <div
          ref={dragRef}
          className={cn(
            "group relative w-full",
            isHighlighted && highlightClassName,
          )}
        >
          <div
            className={cn(
              "flex h-8 w-full cursor-default items-center gap-3 px-1",
              isDraggable && "[&::-webkit-drag-ghost]:opacity-0",
              className,
            )}
            draggable={isDraggable}
            onDragStart={isDraggable ? handleDragStart : undefined}
            onDragEnd={isDraggable ? handleDragEnd : undefined}
          >
            <div className="size-6 flex-shrink-0 overflow-hidden rounded-[0.35rem]">
              {preview}
            </div>
            <span className="w-full flex-1 truncate text-sm">{name}</span>
          </div>
        </div>
      )}

      {isDraggable &&
        isDragging &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="z-9999 pointer-events-none fixed"
            style={{
              left: dragPosition.x - 40,
              top: dragPosition.y - 40,
            }}
          >
            <div className="w-[80px]">
              <AspectRatio
                ratio={1}
                className="ring-3 ring-primary relative overflow-hidden rounded-md shadow-2xl"
              >
                <div className="h-full w-full [&_img]:h-full [&_img]:w-full [&_img]:rounded-none [&_img]:object-cover">
                  {preview}
                </div>
                {shouldShowPlusOnDrag && (
                  <PlusButton
                    onClick={handleAddToTimeline}
                    tooltipText="Add to timeline or drag to position"
                  />
                )}
              </AspectRatio>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}

function PlusButton({
  className,
  onClick,
  tooltipText,
}: {
  className?: string;
  onClick?: () => void;
  tooltipText?: string;
}) {
  const button = (
    <Button
      size="icon"
      className={cn(
        "bg-background hover:bg-panel text-foreground absolute bottom-2 right-2 size-5",
        className,
      )}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick?.();
      }}
      title={tooltipText}
    >
      <Plus className="size-4!" />
    </Button>
  );

  if (tooltipText) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{button}</TooltipTrigger>
        <TooltipContent>
          <p>{tooltipText}</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return button;
}
