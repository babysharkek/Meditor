import { TIMELINE_CONSTANTS } from "@/constants/timeline-constants";

export function getTimelineZoomMin({
    duration,
    containerWidth,
}: {
    duration: number;
    containerWidth: number | null | undefined;
}): number {
    const safeDuration = Math.max(duration, 1);
    const paddedDuration =
        safeDuration + TIMELINE_CONSTANTS.PLAYHEAD_LOOKAHEAD_SECONDS;
    const safeContainerWidth = containerWidth ?? 1000;
    const zoomToFit =
        safeContainerWidth /
        (paddedDuration * TIMELINE_CONSTANTS.PIXELS_PER_SECOND);

    return Math.min(
        TIMELINE_CONSTANTS.ZOOM_MAX,
        Math.max(TIMELINE_CONSTANTS.ZOOM_MIN, zoomToFit),
    );
}
