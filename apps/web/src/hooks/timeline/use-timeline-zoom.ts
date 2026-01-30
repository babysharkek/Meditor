import {
	type WheelEvent as ReactWheelEvent,
	type RefObject,
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react";
import { TIMELINE_CONSTANTS } from "@/constants/timeline-constants";
import { useEditor } from "@/hooks/use-editor";

interface UseTimelineZoomProps {
	containerRef: RefObject<HTMLDivElement>;
	minZoom?: number;
	initialZoom?: number;
	initialScrollLeft?: number;
	tracksScrollRef: RefObject<HTMLDivElement>;
	rulerScrollRef: RefObject<HTMLDivElement>;
}

interface UseTimelineZoomReturn {
	zoomLevel: number;
	setZoomLevel: (zoomLevel: number | ((prev: number) => number)) => void;
	handleWheel: (event: ReactWheelEvent) => void;
	saveScrollPosition: () => void;
}

export function useTimelineZoom({
	containerRef,
	minZoom = TIMELINE_CONSTANTS.ZOOM_MIN,
	initialZoom,
	initialScrollLeft,
	tracksScrollRef,
	rulerScrollRef,
}: UseTimelineZoomProps): UseTimelineZoomReturn {
	const editor = useEditor();
	const hasInitializedRef = useRef(false);
	const scrollSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
		null,
	);

	const [zoomLevel, setZoomLevel] = useState(() => {
		if (initialZoom !== undefined) {
			hasInitializedRef.current = true;
			return Math.max(
				minZoom,
				Math.min(TIMELINE_CONSTANTS.ZOOM_MAX, initialZoom),
			);
		}
		return minZoom;
	});

	const applyZoomAnchor = useCallback(
		({
			previousZoom,
			nextZoom,
		}: {
			previousZoom: number;
			nextZoom: number;
		}) => {
			const scrollElement = tracksScrollRef.current;
			if (!scrollElement) return;

			const currentTime = editor.playback.getCurrentTime();
			const zoomPercent =
				(nextZoom - minZoom) / (TIMELINE_CONSTANTS.ZOOM_MAX - minZoom);
			const shouldAnchorToPlayhead =
				zoomPercent > TIMELINE_CONSTANTS.ZOOM_PLAYHEAD_ANCHOR_THRESHOLD;

			let newScrollLeft: number;

			if (shouldAnchorToPlayhead) {
				const playheadPixelsBefore =
					currentTime * TIMELINE_CONSTANTS.PIXELS_PER_SECOND * previousZoom;
				const playheadViewportOffset =
					playheadPixelsBefore - scrollElement.scrollLeft;
				const playheadPixelsAfter =
					currentTime * TIMELINE_CONSTANTS.PIXELS_PER_SECOND * nextZoom;
				newScrollLeft = playheadPixelsAfter - playheadViewportOffset;
			} else {
				const timeAtLeftEdge =
					scrollElement.scrollLeft /
					(TIMELINE_CONSTANTS.PIXELS_PER_SECOND * previousZoom);
				newScrollLeft =
					timeAtLeftEdge * TIMELINE_CONSTANTS.PIXELS_PER_SECOND * nextZoom;
			}

			const clampedScrollLeft = Math.max(0, newScrollLeft);
			scrollElement.scrollLeft = clampedScrollLeft;
			if (rulerScrollRef.current) {
				rulerScrollRef.current.scrollLeft = clampedScrollLeft;
			}
		},
		[editor, minZoom, tracksScrollRef, rulerScrollRef],
	);

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
					applyZoomAnchor({
						previousZoom: prev,
						nextZoom,
					});

					const scrollElement = tracksScrollRef.current;
					if (scrollElement) {
						editor.project.setTimelineViewState({
							viewState: {
								zoomLevel: nextZoom,
								scrollLeft: scrollElement.scrollLeft,
							},
						});
					}

					return nextZoom;
				});
				// for horizontal scrolling (when shift is held or horizontal wheel movement),
				// let the event bubble up to allow ScrollArea to handle it
				return;
			}
		},
		[minZoom, applyZoomAnchor, editor, tracksScrollRef],
	);

	useEffect(() => {
		if (initialZoom !== undefined && !hasInitializedRef.current) {
			hasInitializedRef.current = true;
			setZoomLevel(
				Math.max(minZoom, Math.min(TIMELINE_CONSTANTS.ZOOM_MAX, initialZoom)),
			);
			return;
		}
		setZoomLevel((prev) => {
			if (prev < minZoom) {
				return minZoom;
			}
			return prev;
		});
	}, [minZoom, initialZoom]);

	// biome-ignore lint/correctness/useExhaustiveDependencies: tracksScrollRef is a stable ref
	const wrappedSetZoomLevel = useCallback(
		(zoomLevelOrUpdater: number | ((prev: number) => number)) => {
			setZoomLevel((prev) => {
				const nextZoom =
					typeof zoomLevelOrUpdater === "function"
						? zoomLevelOrUpdater(prev)
						: zoomLevelOrUpdater;
				const clampedZoom = Math.max(
					minZoom,
					Math.min(TIMELINE_CONSTANTS.ZOOM_MAX, nextZoom),
				);
				applyZoomAnchor({
					previousZoom: prev,
					nextZoom: clampedZoom,
				});

				const scrollElement = tracksScrollRef.current;
				if (scrollElement) {
					editor.project.setTimelineViewState({
						viewState: {
							zoomLevel: clampedZoom,
							scrollLeft: scrollElement.scrollLeft,
						},
					});
				}

				return clampedZoom;
			});
		},
		[minZoom, applyZoomAnchor, editor],
	);

	// biome-ignore lint/correctness/useExhaustiveDependencies: tracksScrollRef is a stable ref
	const saveScrollPosition = useCallback(() => {
		if (scrollSaveTimeoutRef.current) {
			clearTimeout(scrollSaveTimeoutRef.current);
		}
		scrollSaveTimeoutRef.current = setTimeout(() => {
			const scrollElement = tracksScrollRef.current;
			if (scrollElement) {
				editor.project.setTimelineViewState({
					viewState: {
						zoomLevel,
						scrollLeft: scrollElement.scrollLeft,
					},
				});
			}
		}, 300);
	}, [zoomLevel, editor]);

	// biome-ignore lint/correctness/useExhaustiveDependencies: refs are stable
	useEffect(() => {
		if (initialScrollLeft === undefined) return;
		const scrollElement = tracksScrollRef.current;
		if (!scrollElement) return;

		const restoreScroll = () => {
			scrollElement.scrollLeft = initialScrollLeft;
			if (rulerScrollRef.current) {
				rulerScrollRef.current.scrollLeft = initialScrollLeft;
			}
		};

		if (scrollElement.scrollWidth > 0) {
			restoreScroll();
		} else {
			const observer = new ResizeObserver(() => {
				if (scrollElement.scrollWidth > 0) {
					restoreScroll();
					observer.disconnect();
				}
			});
			observer.observe(scrollElement);
			return () => observer.disconnect();
		}
	}, [initialScrollLeft]);

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
		setZoomLevel: wrappedSetZoomLevel,
		handleWheel,
		saveScrollPosition,
	};
}
