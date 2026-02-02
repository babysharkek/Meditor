"use client";

import { useFilmstrip } from "@/hooks/timeline/use-filmstrip";
import { TIMELINE_CONSTANTS } from "@/constants/timeline-constants";
import { getThumbnailWidth } from "@/lib/timeline/filmstrip-utils";

interface FilmstripProps {
	mediaId: string;
	file: File | null;
	duration: number;
	trimStart: number;
	trackHeight: number;
	zoomLevel: number;
	fallbackThumbnailUrl?: string;
}

export function Filmstrip({
	mediaId,
	file,
	duration,
	trimStart,
	trackHeight,
	zoomLevel,
	fallbackThumbnailUrl,
}: FilmstripProps) {
	const thumbnailWidth = getThumbnailWidth({ trackHeight });
	const pixelsPerSecond = TIMELINE_CONSTANTS.PIXELS_PER_SECOND * zoomLevel;

	const visibleStartTime = trimStart;
	const visibleEndTime = trimStart + duration;

	const { frames } = useFilmstrip({
		mediaId,
		file,
		duration,
		visibleStartTime,
		visibleEndTime,
		zoomLevel,
	});

	if (frames.length === 0 && fallbackThumbnailUrl) {
		return (
			<div className="absolute inset-0 flex items-center justify-center">
				<div
					className="absolute right-0 left-0"
					style={{
						backgroundImage: `url(${fallbackThumbnailUrl})`,
						backgroundRepeat: "repeat-x",
						backgroundSize: `${thumbnailWidth}px ${trackHeight}px`,
						backgroundPosition: "left center",
						pointerEvents: "none",
						top: 0,
						bottom: 0,
					}}
				/>
			</div>
		);
	}

	return (
		<div className="absolute inset-0 overflow-hidden">
			{frames.map((frame) => {
				const left = (frame.timestamp - visibleStartTime) * pixelsPerSecond;

				return (
					<div
						key={`${frame.mediaId}-${frame.timestamp}-${frame.tier}`}
						className="absolute top-0 h-full bg-cover bg-center"
						style={{
							left: `${left}px`,
							width: `${thumbnailWidth}px`,
							backgroundImage: `url(${frame.dataUrl})`,
							pointerEvents: "none",
						}}
					/>
				);
			})}
		</div>
	);
}
