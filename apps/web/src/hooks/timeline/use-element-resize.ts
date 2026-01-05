import { useState, useEffect } from "react";
import { TimelineElement, TimelineTrack } from "@/types/timeline";
import { DEFAULT_FPS } from "@/constants/editor-constants";
import { snapTimeToFrame } from "@/lib/time-utils";
import { EditorCore } from "@/core";
import { UpdateElementTrimCommand } from "@/lib/commands/timeline/element/update-element-trim";
import { UpdateElementStartTimeCommand } from "@/lib/commands/timeline/element/update-element-start-time";
import { UpdateElementDurationCommand } from "@/lib/commands/timeline/element/update-element-duration";
import type { MediaFile } from "@/types/assets";

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
  const [resizing, setResizing] = useState<ResizeState | null>(null);
  const [currentTrimStart, setCurrentTrimStart] = useState(element.trimStart);
  const [currentTrimEnd, setCurrentTrimEnd] = useState(element.trimEnd);
  const [currentStartTime, setCurrentStartTime] = useState(element.startTime);
  const [currentDuration, setCurrentDuration] = useState(element.duration);

  const editor = EditorCore.getInstance();
  const mediaFiles = editor.media.getMediaFiles();
  const activeProject = editor.project.getActive();

  useEffect(() => {
    if (!resizing) return;

    const handleDocumentMouseMove = (e: MouseEvent) => {
      updateTrimFromMouseMove({ clientX: e.clientX });
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
    if (element.type === "text") {
      return true;
    }

    if (element.type === "media") {
      const mediaFile = mediaFiles.find(
        (file: MediaFile) => file.id === element.mediaId,
      );
      if (!mediaFile) return false;

      if (mediaFile.type === "image") {
        return true;
      }

      return false;
    }

    return false;
  };

  const updateTrimFromMouseMove = ({ clientX }: { clientX: number }) => {
    if (!resizing) return;

    const deltaX = clientX - resizing.startX;
    const deltaTime = deltaX / (50 * zoomLevel);

    const projectFps = activeProject?.fps || DEFAULT_FPS;

    if (resizing.side === "left") {
      const maxAllowed =
        resizing.initialDuration - resizing.initialTrimEnd - 0.1;
      const calculated = resizing.initialTrimStart + deltaTime;

      if (calculated >= 0) {
        const newTrimStart = snapTimeToFrame({
          time: Math.min(maxAllowed, calculated),
          fps: projectFps,
        });
        const trimDelta = newTrimStart - resizing.initialTrimStart;
        const newStartTime = snapTimeToFrame({
          time: resizing.initialStartTime + trimDelta,
          fps: projectFps,
        });

        setCurrentTrimStart(newTrimStart);
        setCurrentStartTime(newStartTime);
      } else {
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
          const newTrimStart = 0;
          const trimDelta = newTrimStart - resizing.initialTrimStart;
          const newStartTime = snapTimeToFrame({
            time: resizing.initialStartTime + trimDelta,
            fps: projectFps,
          });

          setCurrentTrimStart(newTrimStart);
          setCurrentStartTime(newStartTime);
        }
      }
    } else {
      const calculated = resizing.initialTrimEnd - deltaTime;

      if (calculated < 0) {
        if (canExtendElementDuration()) {
          const extensionNeeded = Math.abs(calculated);
          const newDuration = snapTimeToFrame({
            time: resizing.initialDuration + extensionNeeded,
            fps: projectFps,
          });
          const newTrimEnd = 0;

          setCurrentDuration(newDuration);
          setCurrentTrimEnd(newTrimEnd);
        } else {
          setCurrentTrimEnd(0);
        }
      } else {
        const currentEndTime =
          resizing.initialStartTime +
          resizing.initialDuration -
          resizing.initialTrimStart -
          resizing.initialTrimEnd;
        const desiredEndTime = currentEndTime + deltaTime;

        const snappedEndTime = snapTimeToFrame({
          time: desiredEndTime,
          fps: projectFps,
        });

        const newTrimEnd = Math.max(
          0,
          resizing.initialDuration -
            resizing.initialTrimStart -
            (snappedEndTime - resizing.initialStartTime),
        );

        const maxTrimEnd =
          resizing.initialDuration - resizing.initialTrimStart - 0.1;
        const finalTrimEnd = Math.min(maxTrimEnd, newTrimEnd);

        setCurrentTrimEnd(finalTrimEnd);
      }
    }
  };

  const handleResizeEnd = () => {
    if (!resizing) return;

    const editor = EditorCore.getInstance();

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
