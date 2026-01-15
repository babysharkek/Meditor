import { useState, useEffect } from "react";
import { TimelineElement, TimelineTrack } from "@/types/timeline";
import { snapTimeToFrame } from "@/lib/time-utils";
import { EditorCore } from "@/core";
import { UpdateElementTrimCommand } from "@/lib/commands/timeline/element/update-element-trim";
import { UpdateElementStartTimeCommand } from "@/lib/commands/timeline/element/update-element-start-time";
import { UpdateElementDurationCommand } from "@/lib/commands/timeline/element/update-element-duration";

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
        } else {
          const extensionToLimit = resizing.initialTrimEnd;
          const newDuration = snapTimeToFrame({
            time: resizing.initialDuration + extensionToLimit,
            fps: projectFps,
          });

          setCurrentDuration(newDuration);
          setCurrentTrimEnd(0);
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
      }
    }
  };

  const handleResizeEnd = () => {
    if (!resizing) return;

    const trimStartChanged = currentTrimStart !== resizing.initialTrimStart;
    const trimEndChanged = currentTrimEnd !== resizing.initialTrimEnd;
    const startTimeChanged = currentStartTime !== resizing.initialStartTime;
    const durationChanged = currentDuration !== resizing.initialDuration;

    if (trimStartChanged || trimEndChanged) {
      const trimCommand = new UpdateElementTrimCommand(
        track.id,
        element.id,
        currentTrimStart,
        currentTrimEnd,
      );
      editor.command.execute({ command: trimCommand });
    }

    if (startTimeChanged) {
      const startTimeCommand = new UpdateElementStartTimeCommand(
        [{ trackId: track.id, elementId: element.id }],
        currentStartTime,
      );
      editor.command.execute({ command: startTimeCommand });
    }

    if (durationChanged) {
      const durationCommand = new UpdateElementDurationCommand(
        track.id,
        element.id,
        currentDuration,
      );
      editor.command.execute({ command: durationCommand });
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
