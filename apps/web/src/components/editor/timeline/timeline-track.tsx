"use client";

import { useElementSelection } from "@/hooks/use-element-selection";
import { TimelineElement } from "./timeline-element";
import { TimelineTrack } from "@/types/timeline";
import type { TimelineElement as TimelineElementType } from "@/types/timeline";
import { TIMELINE_CONSTANTS } from "@/constants/timeline-constants";
import { useEdgeAutoScroll } from "@/hooks/use-edge-auto-scroll";
import { ElementDragState } from "@/types/timeline";
import { useEditor } from "@/hooks/use-editor";

interface TimelineTrackContentProps {
  track: TimelineTrack;
  zoomLevel: number;
  dragState: ElementDragState;
  rulerScrollRef: React.RefObject<HTMLDivElement>;
  tracksScrollRef: React.RefObject<HTMLDivElement>;
  lastMouseXRef: React.RefObject<number>;
  onElementMouseDown: (params: {
    e: React.MouseEvent;
    element: TimelineElementType;
    track: TimelineTrack;
  }) => void;
  onElementClick: (params: {
    e: React.MouseEvent;
    element: TimelineElementType;
    track: TimelineTrack;
  }) => void;
}

export function TimelineTrackContent({
  track,
  zoomLevel,
  dragState,
  rulerScrollRef,
  tracksScrollRef,
  lastMouseXRef,
  onElementMouseDown,
  onElementClick,
}: TimelineTrackContentProps) {
  const editor = useEditor();
  const { isSelected, clearSelection } = useElementSelection();

  const duration = editor.timeline.getTotalDuration();

  useEdgeAutoScroll({
    isActive: dragState.isDragging,
    getMouseClientX: () => lastMouseXRef.current ?? 0,
    rulerScrollRef,
    tracksScrollRef,
    contentWidth: duration * TIMELINE_CONSTANTS.PIXELS_PER_SECOND * zoomLevel,
  });

  return (
    <div className="hover:bg-muted/20 size-full" onClick={clearSelection}>
      <div className="track-elements-container relative h-full min-w-full">
        {track.elements.length === 0 ? (
          <div className="text-muted-foreground border-muted/30 flex size-full items-center justify-center rounded-sm border-2 border-dashed text-xs" />
        ) : (
          <>
            {track.elements.map((element) => {
              const isElementSelected = isSelected({
                trackId: track.id,
                elementId: element.id,
              });

              return (
                <TimelineElement
                  key={element.id}
                  element={element}
                  track={track}
                  zoomLevel={zoomLevel}
                  isSelected={isElementSelected}
                  onElementMouseDown={(e, el) =>
                    onElementMouseDown({ e, element: el, track })
                  }
                  onElementClick={(e, el) =>
                    onElementClick({ e, element: el, track })
                  }
                  dragState={dragState}
                />
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}
