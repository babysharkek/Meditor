import { useState, useEffect, useRef } from "react";
import { TimelineElement, TimelineTrack } from "@/types/timeline";
import { snapTimeToFrame } from "@/lib/time-utils";
import { EditorCore } from "@/core";

export interface ResizeState {
  elementId: string;
  side: "left" | "right";
  startX: number;
  initialTrimStart: number;
  initialTrimEnd: number;
  initialStartTime: number;
  initialDuration: number;
}

interface UseTimelineElementResizeProps {
  element: TimelineElement;
  track: TimelineTrack;
  zoomLevel: number;
}

export function useTimelineElementResize({
  element,
  track,
  zoomLevel,
}: UseTimelineElementResizeProps) {
  const editor = EditorCore.getInstance();
  const activeProject = editor.project.getActive();

  const [resizing, setResizing] = useState<ResizeState | null>(null);
  const [currentTrimStart, setCurrentTrimStart] = useState(element.trimStart);
  const [currentTrimEnd, setCurrentTrimEnd] = useState(element.trimEnd);
  const [currentStartTime, setCurrentStartTime] = useState(element.startTime);
  const [currentDuration, setCurrentDuration] = useState(element.duration);
  const currentTrimStartRef = useRef(element.trimStart);
  const currentTrimEndRef = useRef(element.trimEnd);
  const currentStartTimeRef = useRef(element.startTime);
  const currentDurationRef = useRef(element.duration);

  useEffect(() => {
    if (!resizing) return;

    const handleDocumentMouseMove = ({ clientX }: MouseEvent) => {
      updateTrimFromMouseMove({ clientX });
    };

    const handleDocumentMouseUp = () => {
      handleResizeEnd();
    };

    document.addEventListener("mousemove", handleDocumentMouseMove);
    document.addEventListener("mouseup", handleDocumentMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleDocumentMouseMove);
      document.removeEventListener("mouseup", handleDocumentMouseUp);
    };
  }, [resizing]);

  const handleResizeStart = ({
    e,
    elementId,
    side,
  }: {
    e: React.MouseEvent;
    elementId: string;
    side: "left" | "right";
  }) => {
    e.stopPropagation();
    e.preventDefault();

    setResizing({
      elementId,
      side,
      startX: e.clientX,
      initialTrimStart: element.trimStart,
      initialTrimEnd: element.trimEnd,
      initialStartTime: element.startTime,
      initialDuration: element.duration,
    });

    setCurrentTrimStart(element.trimStart);
    setCurrentTrimEnd(element.trimEnd);
    setCurrentStartTime(element.startTime);
    setCurrentDuration(element.duration);
    currentTrimStartRef.current = element.trimStart;
    currentTrimEndRef.current = element.trimEnd;
    currentStartTimeRef.current = element.startTime;
    currentDurationRef.current = element.duration;
  };

  const canExtendElementDuration = () => {
    if (element.type === "text" || element.type === "image") {
      return true;
    }

    return false;
  };

  const updateTrimFromMouseMove = ({ clientX }: { clientX: number }) => {
    if (!resizing) return;

    const deltaX = clientX - resizing.startX;
    const deltaTime = deltaX / (50 * zoomLevel);

    const projectFps = activeProject.settings.fps;

    if (resizing.side === "left") {
      const sourceDuration =
        resizing.initialTrimStart +
        resizing.initialDuration +
        resizing.initialTrimEnd;
      const maxAllowed = sourceDuration - resizing.initialTrimEnd - 0.1;
      const calculated = resizing.initialTrimStart + deltaTime;

      if (calculated >= 0 && calculated <= maxAllowed) {
        const newTrimStart = snapTimeToFrame({
          time: Math.min(maxAllowed, calculated),
          fps: projectFps,
        });
        const trimDelta = newTrimStart - resizing.initialTrimStart;
        const newStartTime = snapTimeToFrame({
          time: resizing.initialStartTime + trimDelta,
          fps: projectFps,
        });
        const newDuration = snapTimeToFrame({
          time: resizing.initialDuration - trimDelta,
          fps: projectFps,
        });

        setCurrentTrimStart(newTrimStart);
        setCurrentStartTime(newStartTime);
        setCurrentDuration(newDuration);
        currentTrimStartRef.current = newTrimStart;
        currentStartTimeRef.current = newStartTime;
        currentDurationRef.current = newDuration;
      } else if (calculated < 0) {
        if (canExtendElementDuration()) {
          const extensionAmount = Math.abs(calculated);
          const maxExtension = resizing.initialStartTime;
          const actualExtension = Math.min(extensionAmount, maxExtension);
          const newStartTime = snapTimeToFrame({
            time: resizing.initialStartTime - actualExtension,
            fps: projectFps,
          });
          const newDuration = snapTimeToFrame({
            time: resizing.initialDuration + actualExtension,
            fps: projectFps,
          });

          setCurrentTrimStart(0);
          setCurrentStartTime(newStartTime);
          setCurrentDuration(newDuration);
          currentTrimStartRef.current = 0;
          currentStartTimeRef.current = newStartTime;
          currentDurationRef.current = newDuration;
        } else {
          const trimDelta = 0 - resizing.initialTrimStart;
          const newStartTime = snapTimeToFrame({
            time: resizing.initialStartTime + trimDelta,
            fps: projectFps,
          });
          const newDuration = snapTimeToFrame({
            time: resizing.initialDuration - trimDelta,
            fps: projectFps,
          });

          setCurrentTrimStart(0);
          setCurrentStartTime(newStartTime);
          setCurrentDuration(newDuration);
          currentTrimStartRef.current = 0;
          currentStartTimeRef.current = newStartTime;
          currentDurationRef.current = newDuration;
        }
      }
    } else {
      const sourceDuration =
        resizing.initialTrimStart +
        resizing.initialDuration +
        resizing.initialTrimEnd;
      const newTrimEnd = resizing.initialTrimEnd - deltaTime;

      if (newTrimEnd < 0) {
        if (canExtendElementDuration()) {
          const extensionNeeded = Math.abs(newTrimEnd);
          const newDuration = snapTimeToFrame({
            time: resizing.initialDuration + extensionNeeded,
            fps: projectFps,
          });

          setCurrentDuration(newDuration);
          setCurrentTrimEnd(0);
          currentDurationRef.current = newDuration;
          currentTrimEndRef.current = 0;
        } else {
          const extensionToLimit = resizing.initialTrimEnd;
          const newDuration = snapTimeToFrame({
            time: resizing.initialDuration + extensionToLimit,
            fps: projectFps,
          });

          setCurrentDuration(newDuration);
          setCurrentTrimEnd(0);
          currentDurationRef.current = newDuration;
          currentTrimEndRef.current = 0;
        }
      } else {
        const maxTrimEnd = sourceDuration - resizing.initialTrimStart - 0.1;
        const clampedTrimEnd = Math.min(maxTrimEnd, Math.max(0, newTrimEnd));
        const finalTrimEnd = snapTimeToFrame({
          time: clampedTrimEnd,
          fps: projectFps,
        });
        const trimDelta = finalTrimEnd - resizing.initialTrimEnd;
        const newDuration = snapTimeToFrame({
          time: resizing.initialDuration - trimDelta,
          fps: projectFps,
        });

        setCurrentTrimEnd(finalTrimEnd);
        setCurrentDuration(newDuration);
        currentTrimEndRef.current = finalTrimEnd;
        currentDurationRef.current = newDuration;
      }
    }
  };

  const handleResizeEnd = () => {
    if (!resizing) return;

    const finalTrimStart = currentTrimStartRef.current;
    const finalTrimEnd = currentTrimEndRef.current;
    const finalStartTime = currentStartTimeRef.current;
    const finalDuration = currentDurationRef.current;
    const trimStartChanged = finalTrimStart !== resizing.initialTrimStart;
    const trimEndChanged = finalTrimEnd !== resizing.initialTrimEnd;
    const startTimeChanged = finalStartTime !== resizing.initialStartTime;
    const durationChanged = finalDuration !== resizing.initialDuration;

    if (trimStartChanged || trimEndChanged) {
      editor.timeline.updateElementTrim({
        elementId: element.id,
        trimStart: finalTrimStart,
        trimEnd: finalTrimEnd,
      });
    }

    if (startTimeChanged) {
      editor.timeline.updateElementStartTime({
        elements: [{ trackId: track.id, elementId: element.id }],
        startTime: finalStartTime,
      });
    }

    if (durationChanged) {
      editor.timeline.updateElementDuration({
        trackId: track.id,
        elementId: element.id,
        duration: finalDuration,
      });
    }

    setResizing(null);
  };

  return {
    resizing,
    isResizing: resizing !== null,
    handleResizeStart,
    currentTrimStart,
    currentTrimEnd,
    currentStartTime,
    currentDuration,
  };
}
