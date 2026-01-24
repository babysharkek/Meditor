import {
	type WheelEvent as ReactWheelEvent,
	type RefObject,
	useCallback,
	useEffect,
	useState,
} from "react";
import { TIMELINE_CONSTANTS } from "@/constants/timeline-constants";

interface UseTimelineZoomProps {
	containerRef: RefObject<HTMLDivElement>;
	minZoom?: number;
}

interface UseTimelineZoomReturn {
	zoomLevel: number;
	setZoomLevel: (zoomLevel: number | ((prev: number) => number)) => void;
	handleWheel: (event: ReactWheelEvent) => void;
}

export function useTimelineZoom({
	containerRef,
	minZoom = TIMELINE_CONSTANTS.ZOOM_MIN,
}: UseTimelineZoomProps): UseTimelineZoomReturn {
	const [zoomLevel, setZoomLevel] = useState(1);

	const handleWheel = useCallback(
		(event: ReactWheelEvent) => {
			const isZoomGesture = event.ctrlKey || event.metaKey;
			const isHorizontalScrollGesture =
				event.shiftKey || Math.abs(event.deltaX) > Math.abs(event.deltaY);

			if (isHorizontalScrollGesture) {
				return;
			}

			// pinch-zoom (ctrl/meta + wheel)
			if (isZoomGesture) {
				const zoomMultiplier = event.deltaY > 0 ? 1 / 1.1 : 1.1;
				setZoomLevel((prev) => {
					const nextZoom = Math.max(
						minZoom,
						Math.min(TIMELINE_CONSTANTS.ZOOM_MAX, prev * zoomMultiplier),
					);
					return nextZoom;
				});
				// for horizontal scrolling (when shift is held or horizontal wheel movement),
				// let the event bubble up to allow ScrollArea to handle it
				return;
			}
		},
		[minZoom],
	);

	useEffect(() => {
		setZoomLevel((prev) => (prev < minZoom ? minZoom : prev));
	}, [minZoom]);

	// prevent browser zoom in the timeline
	useEffect(() => {
		const preventZoom = (event: WheelEvent) => {
			const isZoomKeyPressed = event.ctrlKey || event.metaKey;
			const isInContainer = containerRef.current?.contains(
				event.target as Node,
			);
			// only check isInContainer, not isInTimeline state - the state check
			// causes race conditions where the closure captures stale state
			if (isZoomKeyPressed && isInContainer) {
				event.preventDefault();
			}
		};

		document.addEventListener("wheel", preventZoom, {
			passive: false,
			capture: true,
		});

		return () => {
			document.removeEventListener("wheel", preventZoom, { capture: true });
		};
	}, [containerRef]);

	return {
		zoomLevel,
		setZoomLevel,
		handleWheel,
	};
}
