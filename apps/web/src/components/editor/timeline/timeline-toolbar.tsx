import { useEditor } from "@/hooks/use-editor";
import { useElementSelection } from "@/hooks/use-element-selection";
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
  setZoomLevel: ({ zoom }: { zoom: number }) => void;
}) {
  const editor = useEditor();
  const { selectedElements, clearSelection } = useElementSelection();

  const handleSplitSelected = () => {
    editor.timeline.splitElements({
      elements: selectedElements,
      splitTime: editor.playback.currentTime,
    });
  };

  const handleDuplicateSelected = () => {
    if (selectedElements.length !== 1) {
      toast.error("Select exactly one element");
      return;
    }
    editor.timeline.duplicateElements({ elements: selectedElements });
    clearSelection();
  };

  const handleSplitAndKeepLeft = () => {
    editor.timeline.splitElements({
      elements: selectedElements,
      splitTime: editor.playback.currentTime,
      retainSide: "left",
    });
  };

  const handleSplitAndKeepRight = () => {
    editor.timeline.splitElements({
      elements: selectedElements,
      splitTime: editor.playback.currentTime,
      retainSide: "right",
    });
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
    setZoomLevel({ zoom: newZoomLevel });
  };

  const hasNoTracks = editor.timeline.getTracks().length === 0;

  return (
    <div className="flex h-10 items-center justify-between border-b px-2 py-1">
      <ToolbarLeftSection
        hasNoTracks={hasNoTracks}
        onSplit={handleSplitSelected}
        onSplitLeft={handleSplitAndKeepLeft}
        onSplitRight={handleSplitAndKeepRight}
        onDuplicate={handleDuplicateSelected}
      />

      <SceneSelector />

      <ToolbarRightSection
        zoomLevel={zoomLevel}
        onZoomChange={(zoom) => setZoomLevel({ zoom })}
        onZoom={handleZoom}
      />
    </div>
  );
}

function ToolbarLeftSection({
  hasNoTracks,
  onSplit,
  onSplitLeft,
  onSplitRight,
  onDuplicate,
}: {
  hasNoTracks: boolean;
  onSplit: () => void;
  onSplitLeft: () => void;
  onSplitRight: () => void;
  onDuplicate: () => void;
}) {
  const editor = useEditor();
  const { selectedElements } = useElementSelection();

  const currentTime = editor.playback.currentTime;
  const duration = editor.timeline.getTotalDuration();
  const isPlaying = editor.playback.isPlaying;
  const activeProject = editor.project.getActive();
  const fps = activeProject?.fps ?? DEFAULT_FPS;
  const currentBookmarked = editor.scene.isBookmarked({ time: currentTime });

  return (
    <div className="flex items-center gap-1">
      <TooltipProvider delayDuration={500}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="text"
              size="icon"
              type="button"
              onClick={() => editor.playback.toggle()}
            >
              {isPlaying ? (
                <Pause className="size-4" />
              ) : (
                <Play className="size-4" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {isPlaying ? "Pause (Space)" : "Play (Space)"}
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="text"
              size="icon"
              type="button"
              onClick={() => editor.playback.seek({ time: 0 })}
            >
              <SkipBack className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Return to Start (Home / Enter)</TooltipContent>
        </Tooltip>

        <div className="bg-border mx-1 h-6 w-px" />

        <TimeDisplay currentTime={currentTime} duration={duration} fps={fps} />

        <div className="bg-border mx-1 h-6 w-px" />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="text" size="icon" type="button" onClick={onSplit}>
              <Scissors className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Split element (Ctrl+S)</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="text"
              size="icon"
              type="button"
              onClick={onSplitLeft}
            >
              <ArrowLeftToLine className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Split and keep left (Ctrl+Q)</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="text"
              size="icon"
              type="button"
              onClick={onSplitRight}
            >
              <ArrowRightToLine className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Split and keep right (Ctrl+W)</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="text" size="icon" disabled type="button">
              <SplitSquareHorizontal className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Separate audio (Coming soon)</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="text"
              size="icon"
              type="button"
              onClick={onDuplicate}
            >
              <Copy className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Duplicate element (Ctrl+D)</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="text"
              size="icon"
              type="button"
              onClick={() =>
                toast.info("Freeze frame functionality coming soon!")
              }
            >
              <Snowflake className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Freeze frame (F)</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="text"
              size="icon"
              type="button"
              onClick={() =>
                editor.timeline.deleteElements({ elements: selectedElements })
              }
            >
              <Trash2 className="size-4" />
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
              type="button"
              onClick={() => editor.scene.toggleBookmark({ time: currentTime })}
            >
              <Bookmark
                className={`size-4 ${currentBookmarked ? "fill-primary text-primary" : ""}`}
              />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {currentBookmarked ? "Remove bookmark" : "Add bookmark"}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}

function TimeDisplay({
  currentTime,
  duration,
  fps,
}: {
  currentTime: number;
  duration: number;
  fps: number;
}) {
  const editor = useEditor();

  return (
    <div className="flex flex-row items-center justify-center px-2">
      <EditableTimecode
        time={currentTime}
        duration={duration}
        format="HH:MM:SS:FF"
        fps={fps}
        onTimeChange={(time) => editor.playback.seek({ time })}
        className="text-center"
      />
      <div className="text-muted-foreground px-2 font-mono text-xs">/</div>
      <div className="text-muted-foreground text-center font-mono text-xs">
        {formatTimeCode({ timeInSeconds: duration })}
        {formatTimeCode({
          timeInSeconds: duration,
          format: "HH:MM:SS:FF",
        })}
      </div>
    </div>
  );
}

function SceneSelector() {
  const editor = useEditor();
  const currentScene = editor.scene.getCurrentScene();
  const scenesCount = editor.scene.getScenes().length;

  return (
    <div>
      <SplitButton className="border-foreground/10 border">
        <SplitButtonLeft>{currentScene?.name || "No Scene"}</SplitButtonLeft>
        <SplitButtonSeparator />
        <ScenesView>
          <SplitButtonRight
            disabled={scenesCount === 1}
            onClick={() => {}}
            type="button"
          >
            <LayersIcon className="size-4" />
          </SplitButtonRight>
        </ScenesView>
      </SplitButton>
    </div>
  );
}

function ToolbarRightSection({
  zoomLevel,
  onZoomChange,
  onZoom,
}: {
  zoomLevel: number;
  onZoomChange: (zoom: number) => void;
  onZoom: (options: { direction: "in" | "out" }) => void;
}) {
  return (
    <div className="flex items-center gap-1">
      <TooltipProvider delayDuration={500}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="text" size="icon" type="button" onClick={() => {}}>
              <Magnet className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Auto snapping</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="text" size="icon" type="button" onClick={() => {}}>
              <Link className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Enable Ripple Editing</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <div className="bg-border mx-1 h-6 w-px" />

      <div className="flex items-center gap-1">
        <Button
          variant="text"
          size="icon"
          type="button"
          onClick={() => onZoom({ direction: "out" })}
        >
          <ZoomOut className="size-4" />
        </Button>
        <Slider
          className="w-24"
          value={[zoomLevel]}
          onValueChange={(values) => onZoomChange(values[0])}
          min={TIMELINE_CONSTANTS.ZOOM_MIN}
          max={TIMELINE_CONSTANTS.ZOOM_MAX}
          step={TIMELINE_CONSTANTS.ZOOM_STEP}
        />
        <Button
          variant="text"
          size="icon"
          type="button"
          onClick={() => onZoom({ direction: "in" })}
        >
          <ZoomIn className="size-4" />
        </Button>
      </div>
    </div>
  );
}
