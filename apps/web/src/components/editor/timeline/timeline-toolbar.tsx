import { usePlaybackStore } from "@/stores/playback-store";
import { useProjectStore } from "@/stores/project-store";
import { useTimelineStore } from "@/stores/timeline-store";
import { useSceneStore } from "@/stores/scene-store";
import { toast } from "sonner";
import {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import {
  Pause,
  Play,
  SkipBack,
  Bookmark,
  Magnet,
  Link,
  ZoomOut,
  ZoomIn,
  Copy,
  Trash2,
  Snowflake,
  ArrowLeftToLine,
  ArrowRightToLine,
  SplitSquareHorizontal,
  Scissors,
  LayersIcon,
} from "lucide-react";
import {
  SplitButton,
  SplitButtonLeft,
  SplitButtonRight,
  SplitButtonSeparator,
} from "@/components/ui/split-button";
import { Slider } from "@/components/ui/slider";
import { DEFAULT_FPS } from "@/constants/editor-constants";
import { formatTimeCode } from "@/lib/time-utils";
import { TIMELINE_CONSTANTS } from "@/constants/timeline-constants";
import { EditableTimecode } from "@/components/ui/editable-timecode";
import { ScenesView } from "../scenes-view";

export function TimelineToolbar({
  zoomLevel,
  setZoomLevel,
}: {
  zoomLevel: number;
  setZoomLevel: (zoom: number) => void;
}) {
  const {
    tracks,
    addTrack,
    addElementToTrack,
    selectedElements,
    clearSelectedElements,
    deleteSelected,
    splitSelected,
    splitAndKeepLeft,
    splitAndKeepRight,
    snappingEnabled,
    toggleSnapping,
    rippleEditingEnabled,
    toggleRippleEditing,
  } = useTimelineStore();
  const { currentTime, duration, isPlaying, toggle, seek } = usePlaybackStore();
  const { activeProject } = useProjectStore();
  const { toggleBookmark, isBookmarked } = useSceneStore();
  const { scenes, currentScene } = useSceneStore();

  const handleSplitSelected = () => {
    splitSelected(currentTime);
  };

  const handleDuplicateSelected = () => {
    if (selectedElements.length === 0) return;
    const canDuplicate = selectedElements.length === 1;
    if (!canDuplicate) return;

    selectedElements.forEach(({ trackId, elementId }) => {
      const track = tracks.find((t) => t.id === trackId);
      const element = track?.elements.find((el) => el.id === elementId);
      if (element) {
        const newStartTime =
          element.startTime +
          (element.duration - element.trimStart - element.trimEnd) +
          0.1;
        const { id, ...elementWithoutId } = element;
        addElementToTrack(trackId, {
          ...elementWithoutId,
          startTime: newStartTime,
        });
      }
    });
    clearSelectedElements();
  };

  const handleFreezeSelected = () => {
    toast.info("Freeze frame functionality coming soon!");
  };

  const handleSplitAndKeepLeft = () => {
    if (selectedElements.length !== 1) {
      toast.error("Select exactly one element");
      return;
    }
    const { trackId, elementId } = selectedElements[0];
    const track = tracks.find((t) => t.id === trackId);
    const element = track?.elements.find((c) => c.id === elementId);
    if (!element) return;
    const effectiveStart = element.startTime;
    const effectiveEnd =
      element.startTime +
      (element.duration - element.trimStart - element.trimEnd);
    if (currentTime <= effectiveStart || currentTime >= effectiveEnd) {
      toast.error("Playhead must be within selected element");
      return;
    }
    splitAndKeepLeft(trackId, elementId, currentTime);
  };

  const handleSplitAndKeepRight = () => {
    if (selectedElements.length !== 1) {
      toast.error("Select exactly one element");
      return;
    }
    const { trackId, elementId } = selectedElements[0];
    const track = tracks.find((t) => t.id === trackId);
    const element = track?.elements.find((c) => c.id === elementId);
    if (!element) return;
    const effectiveStart = element.startTime;
    const effectiveEnd =
      element.startTime +
      (element.duration - element.trimStart - element.trimEnd);
    if (currentTime <= effectiveStart || currentTime >= effectiveEnd) {
      toast.error("Playhead must be within selected element");
      return;
    }
    splitAndKeepRight(trackId, elementId, currentTime);
  };

  const handleZoom = ({ direction }: { direction: "in" | "out" }) => {
    const newZoomLevel =
      direction === "in"
        ? Math.min(
            TIMELINE_CONSTANTS.ZOOM_MAX,
            zoomLevel + TIMELINE_CONSTANTS.ZOOM_STEP,
          )
        : Math.max(
            TIMELINE_CONSTANTS.ZOOM_MIN,
            zoomLevel - TIMELINE_CONSTANTS.ZOOM_STEP,
          );
    setZoomLevel(newZoomLevel);
  };

  const currentBookmarked = isBookmarked({ time: currentTime });

  return (
    <div className="flex h-10 items-center justify-between border-b px-2 py-1">
      <div className="flex items-center gap-1">
        <TooltipProvider delayDuration={500}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="text" size="icon" onClick={toggle}>
                {isPlaying ? (
                  <Pause className="h-4 w-4" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {isPlaying ? "Pause (Space)" : "Play (Space)"}
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="text" size="icon" onClick={() => seek(0)}>
                <SkipBack className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Return to Start (Home / Enter)</TooltipContent>
          </Tooltip>
          <div className="bg-border mx-1 h-6 w-px" />
          {/* Time Display */}
          <div className="flex flex-row items-center justify-center px-2">
            <EditableTimecode
              time={currentTime}
              duration={duration}
              format="HH:MM:SS:FF"
              fps={activeProject?.fps ?? DEFAULT_FPS}
              onTimeChange={seek}
              className="text-center"
            />
            <div className="text-muted-foreground px-2 font-mono text-xs">
              /
            </div>
            <div className="text-muted-foreground text-center font-mono text-xs">
              {formatTimeCode({ timeInSeconds: duration })}
              {formatTimeCode({
                timeInSeconds: duration,
                format: "HH:MM:SS:FF",
              })}
            </div>
          </div>
          {tracks.length === 0 && (
            <>
              <div className="bg-border mx-1 h-6 w-px" />
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const trackId = addTrack("media");
                      addElementToTrack(trackId, {
                        type: "media",
                        mediaId: "test",
                        name: "Test Clip",
                        duration: TIMELINE_CONSTANTS.DEFAULT_TEXT_DURATION,
                        startTime: 0,
                        trimStart: 0,
                        trimEnd: 0,
                      });
                    }}
                    className="text-xs"
                  >
                    Add Test Clip
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Add a test clip to try playback</TooltipContent>
              </Tooltip>
            </>
          )}
          <div className="bg-border mx-1 h-6 w-px" />
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="text" size="icon" onClick={handleSplitSelected}>
                <Scissors className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Split element (Ctrl+S)</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="text"
                size="icon"
                onClick={handleSplitAndKeepLeft}
              >
                <ArrowLeftToLine className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Split and keep left (Ctrl+Q)</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="text"
                size="icon"
                onClick={handleSplitAndKeepRight}
              >
                <ArrowRightToLine className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Split and keep right (Ctrl+W)</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="text" size="icon" disabled>
                <SplitSquareHorizontal className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Separate audio (Coming soon)</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="text"
                size="icon"
                onClick={handleDuplicateSelected}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Duplicate element (Ctrl+D)</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="text" size="icon" onClick={handleFreezeSelected}>
                <Snowflake className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Freeze frame (F)</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="text"
                size="icon"
                onClick={() => deleteSelected()}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Delete element (Delete)</TooltipContent>
          </Tooltip>
          <div className="bg-border mx-1 h-6 w-px" />
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="text"
                size="icon"
                onClick={() => toggleBookmark({ time: currentTime })}
              >
                <Bookmark
                  className={`h-4 w-4 ${currentBookmarked ? "fill-primary text-primary" : ""}`}
                />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {currentBookmarked ? "Remove bookmark" : "Add bookmark"}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <div>
        <SplitButton className="border-foreground/10 border">
          <SplitButtonLeft>{currentScene?.name || "No Scene"}</SplitButtonLeft>
          <SplitButtonSeparator />
          <ScenesView>
            <SplitButtonRight disabled={scenes.length === 1} onClick={() => {}}>
              <LayersIcon />
            </SplitButtonRight>
          </ScenesView>
        </SplitButton>
      </div>
      <div className="flex items-center gap-1">
        <TooltipProvider delayDuration={500}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="text" size="icon" onClick={toggleSnapping}>
                {snappingEnabled ? (
                  <Magnet className="text-primary h-4 w-4" />
                ) : (
                  <Magnet className="h-4 w-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>Auto snapping</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="text" size="icon" onClick={toggleRippleEditing}>
                <Link
                  className={`h-4 w-4 ${
                    rippleEditingEnabled ? "text-primary" : ""
                  }`}
                />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {rippleEditingEnabled
                ? "Disable Ripple Editing"
                : "Enable Ripple Editing"}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <div className="bg-border mx-1 h-6 w-px" />
        <div className="flex items-center gap-1">
          <Button
            variant="text"
            size="icon"
            onClick={() => handleZoom({ direction: "out" })}
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Slider
            className="w-24"
            value={[zoomLevel]}
            onValueChange={(values) => setZoomLevel(values[0])}
            min={TIMELINE_CONSTANTS.ZOOM_MIN}
            max={TIMELINE_CONSTANTS.ZOOM_MAX}
            step={TIMELINE_CONSTANTS.ZOOM_STEP}
          />
          <Button
            variant="text"
            size="icon"
            onClick={() => handleZoom({ direction: "in" })}
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
