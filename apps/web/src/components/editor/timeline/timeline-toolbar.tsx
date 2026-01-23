import { useEditor } from "@/hooks/use-editor";
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
import { formatTimeCode } from "@/lib/time";
import { TIMELINE_CONSTANTS } from "@/constants/timeline-constants";
import { EditableTimecode } from "@/components/editor/editable-timecode";
import { ScenesView } from "../scenes-view";
import { type TAction, invokeAction } from "@/lib/actions";
import { cn } from "@/utils/ui";
import { useTimelineStore } from "@/stores/timeline-store";

export function TimelineToolbar({
	zoomLevel,
	minZoom,
	setZoomLevel,
}: {
	zoomLevel: number;
	minZoom: number;
	setZoomLevel: ({ zoom }: { zoom: number }) => void;
}) {
	const handleZoom = ({ direction }: { direction: "in" | "out" }) => {
		const newZoomLevel =
			direction === "in"
				? Math.min(
						TIMELINE_CONSTANTS.ZOOM_MAX,
						zoomLevel + TIMELINE_CONSTANTS.ZOOM_STEP,
					)
				: Math.max(minZoom, zoomLevel - TIMELINE_CONSTANTS.ZOOM_STEP);
		setZoomLevel({ zoom: newZoomLevel });
	};

	return (
		<div className="flex h-10 items-center justify-between border-b px-2 py-1">
			<ToolbarLeftSection />

			<SceneSelector />

			<ToolbarRightSection
				zoomLevel={zoomLevel}
				minZoom={minZoom}
				onZoomChange={(zoom) => setZoomLevel({ zoom })}
				onZoom={handleZoom}
			/>
		</div>
	);
}

function ToolbarLeftSection() {
	const editor = useEditor();
	const currentTime = editor.playback.getCurrentTime();
	const isPlaying = editor.playback.getIsPlaying();
	const currentBookmarked = editor.scenes.isBookmarked({ time: currentTime });

	const handleAction = ({
		action,
		event,
	}: {
		action: TAction;
		event: React.MouseEvent;
	}) => {
		event.stopPropagation();
		invokeAction(action);
	};

	return (
		<div className="flex items-center gap-1">
			<TooltipProvider delayDuration={500}>
				<ToolbarButton
					icon={isPlaying ? <Pause /> : <Play />}
					tooltip={isPlaying ? "Pause" : "Play"}
					onClick={({ event }) =>
						handleAction({ action: "toggle-play", event })
					}
				/>

				<ToolbarButton
					icon={<SkipBack />}
					tooltip="Go to start"
					onClick={({ event }) => handleAction({ action: "goto-start", event })}
				/>

				<div className="bg-border mx-2 h-10 w-px" />

				<TimeDisplay />

				<div className="bg-border mx-1 h-10 w-px" />

				<ToolbarButton
					icon={<Scissors />}
					tooltip="Split element"
					onClick={({ event }) =>
						handleAction({ action: "split-selected", event })
					}
				/>

				<ToolbarButton
					icon={<ArrowLeftToLine />}
					tooltip="Split and keep left"
					onClick={({ event }) =>
						handleAction({ action: "split-selected-left", event })
					}
				/>

				<ToolbarButton
					icon={<ArrowRightToLine />}
					tooltip="Split and keep right"
					onClick={({ event }) =>
						handleAction({ action: "split-selected-right", event })
					}
				/>

				<ToolbarButton
					icon={<SplitSquareHorizontal />}
					tooltip="Coming soon" /* separate audio */
					disabled={true}
					onClick={({ event: _event }) => {}}
				/>

				<ToolbarButton
					icon={<Copy />}
					tooltip="Duplicate element"
					onClick={({ event }) =>
						handleAction({ action: "duplicate-selected", event })
					}
				/>

				<ToolbarButton
					icon={<Snowflake />}
					tooltip="Coming soon" /* freeze frame */
					disabled={true}
					onClick={({ event: _event }) => {}}
				/>

				<ToolbarButton
					icon={<Trash2 />}
					tooltip="Delete element"
					onClick={({ event }) =>
						handleAction({ action: "delete-selected", event })
					}
				/>

				<div className="bg-border mx-1 h-6 w-px" />

				<Tooltip>
					<ToolbarButton
						icon={
							<Bookmark
								className={currentBookmarked ? "fill-primary text-primary" : ""}
							/>
						}
						tooltip={currentBookmarked ? "Remove bookmark" : "Add bookmark"}
						onClick={({ event }) =>
							handleAction({ action: "toggle-bookmark", event })
						}
					/>
				</Tooltip>
			</TooltipProvider>
		</div>
	);
}

function TimeDisplay() {
	const editor = useEditor();
	const currentTime = editor.playback.getCurrentTime();
	const totalDuration = editor.timeline.getTotalDuration();
	const fps = editor.project.getActive().settings.fps;

	return (
		<div className="flex flex-row items-center justify-center px-2">
			<EditableTimecode
				time={currentTime}
				duration={totalDuration}
				format="HH:MM:SS:FF"
				fps={fps}
				onTimeChange={({ time }) => editor.playback.seek({ time })}
				className="text-center"
			/>
			<div className="text-muted-foreground px-2 font-mono text-xs">/</div>
			<div className="text-muted-foreground text-center font-mono text-xs">
				{formatTimeCode({
					timeInSeconds: totalDuration,
					format: "HH:MM:SS:FF",
					fps,
				})}
			</div>
		</div>
	);
}

function SceneSelector() {
	const editor = useEditor();
	const currentScene = editor.scenes.getActiveScene();

	return (
		<div>
			<SplitButton className="border-foreground/10 border">
				<SplitButtonLeft>{currentScene?.name || "No Scene"}</SplitButtonLeft>
				<SplitButtonSeparator />
				<ScenesView>
					<SplitButtonRight onClick={() => {}} type="button">
						<LayersIcon className="size-4" />
					</SplitButtonRight>
				</ScenesView>
			</SplitButton>
		</div>
	);
}

function ToolbarRightSection({
	zoomLevel,
	minZoom,
	onZoomChange,
	onZoom,
}: {
	zoomLevel: number;
	minZoom: number;
	onZoomChange: (zoom: number) => void;
	onZoom: (options: { direction: "in" | "out" }) => void;
}) {
	const {
		snappingEnabled,
		rippleEditingEnabled,
		toggleSnapping,
		toggleRippleEditing,
	} = useTimelineStore();

	return (
		<div className="flex items-center gap-1">
			<TooltipProvider delayDuration={500}>
				<ToolbarButton
					icon={
						<Magnet className={cn(snappingEnabled ? "text-primary" : "")} />
					}
					tooltip="Auto snapping"
					onClick={() => toggleSnapping()}
				/>

				<ToolbarButton
					icon={
						<Link className={cn(rippleEditingEnabled ? "text-primary" : "")} />
					}
					tooltip="Ripple editing"
					onClick={() => toggleRippleEditing()}
				/>
			</TooltipProvider>

			<div className="bg-border mx-1 h-6 w-px" />

			<div className="flex items-center gap-1">
				<Button
					variant="text"
					size="icon"
					type="button"
					onClick={() => onZoom({ direction: "out" })}
				>
					<ZoomOut />
				</Button>
				<Slider
					className="w-24"
					value={[zoomLevel]}
					onValueChange={(values) => onZoomChange(values[0])}
					min={minZoom}
					max={TIMELINE_CONSTANTS.ZOOM_MAX}
					step={TIMELINE_CONSTANTS.ZOOM_STEP}
				/>
				<Button
					variant="text"
					size="icon"
					type="button"
					onClick={() => onZoom({ direction: "in" })}
				>
					<ZoomIn />
				</Button>
			</div>
		</div>
	);
}

function ToolbarButton({
	icon,
	tooltip,
	onClick,
	disabled,
}: {
	icon: React.ReactNode;
	tooltip: string;
	onClick: ({ event }: { event: React.MouseEvent }) => void;
	disabled?: boolean;
}) {
	return (
		<Tooltip delayDuration={200}>
			<TooltipTrigger asChild>
				<Button
					variant="text"
					size="icon"
					type="button"
					onClick={(event) => onClick({ event })}
					className={disabled ? "cursor-not-allowed opacity-50" : ""}
				>
					{icon}
				</Button>
			</TooltipTrigger>
			<TooltipContent>{tooltip}</TooltipContent>
		</Tooltip>
	);
}
