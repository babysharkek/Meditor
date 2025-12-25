"use client";

import { useRef, useState, useEffect } from "react";
import { useTimelineStore } from "@/stores/timeline-store";
import { toast } from "sonner";
import { TimelineElement } from "./timeline-element";
import { TimelineTrack } from "@/types/timeline";
import { usePlaybackStore } from "@/stores/playback-store";
import type { TimelineElement as TimelineElementType } from "@/types/timeline";
import { TIMELINE_CONSTANTS } from "@/constants/timeline-constants";
import { useTimelineDragDrop } from "@/hooks/timeline/use-timeline-drag-drop";
import { useEdgeAutoScroll } from "@/hooks/use-edge-auto-scroll";
import { useProjectStore } from "@/stores/project-store";
import { snapTimeToFrame } from "@/lib/time-utils";
import { DEFAULT_FPS } from "@/constants/editor-constants";
import type { SnapPoint } from "@/hooks/timeline/use-timeline-snapping";

export function TimelineTrackContent({
  track,
  zoomLevel,
  onSnapPointChange,
  rulerScrollRef,
  tracksScrollRef,
}: {
  track: TimelineTrack;
  zoomLevel: number;
  onSnapPointChange?: (snapPoint: SnapPoint | null) => void;
  rulerScrollRef: React.RefObject<HTMLDivElement>;
  tracksScrollRef: React.RefObject<HTMLDivElement>;
}) {
  const {
    tracks,
    updateElementStartTime,
    updateElementStartTimeWithRipple,
    selectedElements,
    selectElement,
    dragState,
    startDrag: startDragAction,
    updateDragTime,
    endDrag: endDragAction,
    clearSelectedElements,
    rippleEditingEnabled,
  } = useTimelineStore();

  const { duration } = usePlaybackStore();

  const { isDragOver, wouldOverlap, dragProps } = useTimelineDragDrop({
    track,
    zoomLevel,
    onSnapPointChange,
  });

  const timelineRef = useRef<HTMLDivElement>(null);
  const [mouseDownLocation, setMouseDownLocation] = useState<{
    x: number;
    y: number;
  } | null>(null);

  const lastMouseXRef = useRef(0);

  // Set up mouse event listeners for drag
  useEffect(() => {
    if (!dragState.isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!timelineRef.current) return;
      lastMouseXRef.current = e.clientX;

      // On first mouse move during drag, ensure the element is selected
      if (dragState.elementId && dragState.trackId) {
        const isSelected = selectedElements.some(
          (c) =>
            c.trackId === dragState.trackId &&
            c.elementId === dragState.elementId,
        );

        if (!isSelected) {
          // Select this element (replacing other selections) since we're dragging it
          selectElement(dragState.trackId, dragState.elementId, false);
        }
      }

      const timelineRect = timelineRef.current.getBoundingClientRect();
      const mouseX = e.clientX - timelineRect.left;
      const mouseTime = Math.max(
        0,
        mouseX / (TIMELINE_CONSTANTS.PIXELS_PER_SECOND * zoomLevel),
      );
      const adjustedTime = Math.max(0, mouseTime - dragState.clickOffsetTime);

      const projectStore = useProjectStore.getState();
      const projectFps = projectStore.activeProject?.fps || DEFAULT_FPS;
      const finalTime = snapTimeToFrame({
        time: adjustedTime,
        fps: projectFps,
      });

      updateDragTime(finalTime);
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (!dragState.elementId || !dragState.trackId) return;

      // If this track initiated the drag, we should handle the mouse up regardless of where it occurs
      const isTrackThatStartedDrag = dragState.trackId === track.id;

      const timelineRect = timelineRef.current?.getBoundingClientRect();
      if (!timelineRect) {
        if (isTrackThatStartedDrag) {
          if (rippleEditingEnabled) {
            updateElementStartTimeWithRipple(
              track.id,
              dragState.elementId,
              dragState.currentTime,
            );
          } else {
            updateElementStartTime(
              track.id,
              dragState.elementId,
              dragState.currentTime,
            );
          }
          endDragAction();
          // Clear snap point when drag ends
          onSnapPointChange?.(null);
        }
        return;
      }

      const isMouseOverThisTrack =
        e.clientY >= timelineRect.top && e.clientY <= timelineRect.bottom;

      if (!isMouseOverThisTrack && !isTrackThatStartedDrag) return;

      const finalTime = dragState.currentTime;

      if (isMouseOverThisTrack) {
        const sourceTrack = tracks.find((t) => t.id === dragState.trackId);
        const movingElement = sourceTrack?.elements.find(
          (c) => c.id === dragState.elementId,
        );

        if (movingElement) {
          const movingElementDuration =
            movingElement.duration -
            movingElement.trimStart -
            movingElement.trimEnd;
          const movingElementEnd = finalTime + movingElementDuration;

          const targetTrack = tracks.find((t) => t.id === track.id);
          const hasOverlap = targetTrack?.elements.some((existingElement) => {
            if (
              dragState.trackId === track.id &&
              existingElement.id === dragState.elementId
            ) {
              return false;
            }
            const existingStart = existingElement.startTime;
            const existingEnd =
              existingElement.startTime +
              (existingElement.duration -
                existingElement.trimStart -
                existingElement.trimEnd);
            return finalTime < existingEnd && movingElementEnd > existingStart;
          });

          if (!hasOverlap) {
            if (dragState.trackId === track.id) {
              if (rippleEditingEnabled) {
                updateElementStartTimeWithRipple(
                  track.id,
                  dragState.elementId,
                  finalTime,
                );
              } else {
                updateElementStartTime(
                  track.id,
                  dragState.elementId,
                  finalTime,
                );
              }
            } else {
              toast.info("Moving elements between tracks is coming soon!");
            }
          }
        }
      } else if (isTrackThatStartedDrag) {
        // Mouse is not over this track, but this track started the drag
        // This means user released over ruler/outside - update position within same track
        const sourceTrack = tracks.find((t) => t.id === dragState.trackId);
        const movingElement = sourceTrack?.elements.find(
          (c) => c.id === dragState.elementId,
        );

        if (movingElement) {
          const movingElementDuration =
            movingElement.duration -
            movingElement.trimStart -
            movingElement.trimEnd;
          const movingElementEnd = finalTime + movingElementDuration;

          const hasOverlap = track.elements.some((existingElement) => {
            if (existingElement.id === dragState.elementId) {
              return false;
            }
            const existingStart = existingElement.startTime;
            const existingEnd =
              existingElement.startTime +
              (existingElement.duration -
                existingElement.trimStart -
                existingElement.trimEnd);
            return finalTime < existingEnd && movingElementEnd > existingStart;
          });

          if (!hasOverlap) {
            if (rippleEditingEnabled) {
              updateElementStartTimeWithRipple(
                track.id,
                dragState.elementId,
                finalTime,
              );
            } else {
              updateElementStartTime(track.id, dragState.elementId, finalTime);
            }
          }
        }
      }

      if (isTrackThatStartedDrag) {
        endDragAction();
        // Clear snap point when drag ends
        onSnapPointChange?.(null);
      }
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [
    dragState.isDragging,
    dragState.clickOffsetTime,
    dragState.elementId,
    dragState.trackId,
    dragState.currentTime,
    zoomLevel,
    tracks,
    track.id,
    updateDragTime,
    updateElementStartTime,
    endDragAction,
    selectedElements,
    selectElement,
    onSnapPointChange,
  ]);

  useEdgeAutoScroll({
    isActive: dragState.isDragging,
    getMouseClientX: () => lastMouseXRef.current,
    rulerScrollRef,
    tracksScrollRef,
    contentWidth: duration * TIMELINE_CONSTANTS.PIXELS_PER_SECOND * zoomLevel,
  });

  const handleElementMouseDown = (
    e: React.MouseEvent,
    element: TimelineElementType,
  ) => {
    setMouseDownLocation({ x: e.clientX, y: e.clientY });

    // Detect right-click (button 2) and handle selection without starting drag
    const isRightClick = e.button === 2;
    const isMultiSelect = e.metaKey || e.ctrlKey || e.shiftKey;

    if (isRightClick) {
      // Handle right-click selection
      const isSelected = selectedElements.some(
        (c) => c.trackId === track.id && c.elementId === element.id,
      );

      // If element is not selected, select it (keep other selections if multi-select)
      if (!isSelected) {
        selectElement(track.id, element.id, isMultiSelect);
      }
      // If element is already selected, keep it selected

      // Don't start drag action for right-clicks
      return;
    }

    // Handle multi-selection for left-click with modifiers
    if (isMultiSelect) {
      selectElement(track.id, element.id, true);
    }

    // Calculate the offset from the left edge of the element to where the user clicked
    const elementElement = e.currentTarget as HTMLElement;
    const elementRect = elementElement.getBoundingClientRect();
    const clickOffsetX = e.clientX - elementRect.left;
    const clickOffsetTime =
      clickOffsetX / (TIMELINE_CONSTANTS.PIXELS_PER_SECOND * zoomLevel);

    startDragAction(
      element.id,
      track.id,
      e.clientX,
      element.startTime,
      clickOffsetTime,
    );
  };

  const handleElementClick = (
    e: React.MouseEvent,
    element: TimelineElementType,
  ) => {
    e.stopPropagation();

    // Check if mouse moved significantly
    if (mouseDownLocation) {
      const deltaX = Math.abs(e.clientX - mouseDownLocation.x);
      const deltaY = Math.abs(e.clientY - mouseDownLocation.y);
      // If it moved more than a few pixels, consider it a drag and not a click.
      if (deltaX > 5 || deltaY > 5) {
        setMouseDownLocation(null); // Reset for next interaction
        return;
      }
    }

    // Skip selection logic for multi-selection (handled in mousedown)
    if (e.metaKey || e.ctrlKey || e.shiftKey) {
      return;
    }

    // Handle single selection
    const isSelected = selectedElements.some(
      (c) => c.trackId === track.id && c.elementId === element.id,
    );

    if (!isSelected) {
      // If element is not selected, select it (replacing other selections)
      selectElement(track.id, element.id, false);
    }
    // If element is already selected, keep it selected (do nothing)
  };

  return (
    <div
      className="hover:bg-muted/20 h-full w-full"
      onClick={(e) => {
        // If clicking empty area (not on an element), deselect all elements
        if (!(e.target as HTMLElement).closest(".timeline-element")) {
          clearSelectedElements();
        }
      }}
      {...dragProps}
    >
      <div
        ref={timelineRef}
        className="track-elements-container relative h-full min-w-full"
      >
        {track.elements.length === 0 ? (
          <div
            className={`text-muted-foreground flex h-full w-full items-center justify-center rounded-sm border-2 border-dashed text-xs transition-colors ${
              isDragOver
                ? wouldOverlap
                  ? "border-red-500 bg-red-500/10 text-red-600"
                  : "border-blue-500 bg-blue-500/10 text-blue-600"
                : "border-muted/30"
            }`}
          >
            {isDragOver
              ? wouldOverlap
                ? "Cannot drop - would overlap"
                : "Drop element here"
              : ""}
          </div>
        ) : (
          <>
            {track.elements.map((element) => {
              const isSelected = selectedElements.some(
                (c) => c.trackId === track.id && c.elementId === element.id,
              );

              return (
                <TimelineElement
                  key={element.id}
                  element={element}
                  track={track}
                  zoomLevel={zoomLevel}
                  isSelected={isSelected}
                  onElementMouseDown={handleElementMouseDown}
                  onElementClick={handleElementClick}
                />
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}
