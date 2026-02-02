import { useEffect, useState, useRef } from "react";
import { filmstripService } from "@/services/filmstrip/service";
import type {
	FilmstripFrame,
	FilmstripStatus,
} from "@/services/filmstrip/types";
import {
	getTierForZoom,
	getTimestampsForRange,
} from "@/lib/timeline/filmstrip-utils";

interface UseFilmstripOptions {
	mediaId: string;
	file: File | null;
	duration: number;
	visibleStartTime: number;
	visibleEndTime: number;
	zoomLevel: number;
}

interface UseFilmstripReturn {
	frames: FilmstripFrame[];
	status: FilmstripStatus;
	progress: number;
}

export function useFilmstrip({
	mediaId,
	file,
	duration,
	visibleStartTime,
	visibleEndTime,
	zoomLevel,
}: UseFilmstripOptions): UseFilmstripReturn {
	const [frames, setFrames] = useState<FilmstripFrame[]>([]);
	const [status, setStatus] = useState<FilmstripStatus>("idle");
	const [progress, setProgress] = useState(0);

	const tierRef = useRef<number>(0);
	const requestedTimestampsRef = useRef<Set<number>>(new Set());

	useEffect(() => {
		if (!file || duration <= 0) {
			setFrames([]);
			setStatus("idle");
			setProgress(0);
			return;
		}

		const tier = getTierForZoom({ zoomLevel });
		tierRef.current = tier;

		const timestamps = getTimestampsForRange({
			startTime: visibleStartTime,
			endTime: visibleEndTime,
			tier: tier as 0 | 1 | 2 | 3,
		});

		const cachedFrames = filmstripService.getFrames({
			mediaId,
			tier,
			startTime: visibleStartTime,
			endTime: visibleEndTime,
		});

		setFrames(cachedFrames);

		const missingTimestamps = timestamps.filter(
			(ts) => !cachedFrames.some((f) => f.timestamp === ts),
		);

		if (missingTimestamps.length === 0) {
			setStatus("ready");
			setProgress(100);
			return;
		}

		setStatus("generating");
		setProgress((cachedFrames.length / timestamps.length) * 100);

		const newTimestamps = missingTimestamps.filter(
			(ts) => !requestedTimestampsRef.current.has(ts),
		);

		if (newTimestamps.length > 0) {
			for (const ts of newTimestamps) {
				requestedTimestampsRef.current.add(ts);
			}

			filmstripService.requestFrames({
				mediaId,
				file,
				timestamps: newTimestamps,
				tier,
			});
		}

		const handleFrame = ({
			mediaId: frameMediaId,
		}: {
			mediaId: string;
			timestamp: number;
			dataUrl: string;
		}) => {
			if (frameMediaId !== mediaId) {
				return;
			}

			if (tierRef.current !== tier) {
				return;
			}

			const updatedFrames = filmstripService.getFrames({
				mediaId,
				tier,
				startTime: visibleStartTime,
				endTime: visibleEndTime,
			});

			setFrames(updatedFrames);
			setProgress((updatedFrames.length / timestamps.length) * 100);

			if (updatedFrames.length === timestamps.length) {
				setStatus("ready");
				setProgress(100);
			}
		};

		const handleError = (errorMediaId: string, _error: string) => {
			if (errorMediaId === mediaId) {
				setStatus("error");
			}
		};

		filmstripService.on("frame", handleFrame);
		filmstripService.on("error", handleError);

		return () => {
			filmstripService.off("frame", handleFrame);
			filmstripService.off("error", handleError);
			filmstripService.cancelPending({ mediaId });
		};
	}, [mediaId, file, duration, visibleStartTime, visibleEndTime, zoomLevel]);

	return { frames, status, progress };
}
