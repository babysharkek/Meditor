export type FilmstripTier = 0 | 1 | 2 | 3;

const TIER_INTERVALS: Record<FilmstripTier, number> = {
	0: 5,
	1: 1,
	2: 0.5,
	3: 0.25,
} as const;

export function getTierForZoom({
	zoomLevel,
}: {
	zoomLevel: number;
}): FilmstripTier {
	if (zoomLevel < 0.5) {
		return 0;
	}
	if (zoomLevel < 2) {
		return 1;
	}
	if (zoomLevel < 5) {
		return 2;
	}
	return 3;
}

export function getIntervalForTier({ tier }: { tier: FilmstripTier }): number {
	return TIER_INTERVALS[tier];
}

export function getTimestampsForRange({
	startTime,
	endTime,
	tier,
}: {
	startTime: number;
	endTime: number;
	tier: FilmstripTier;
}): number[] {
	const interval = getIntervalForTier({ tier });
	const timestamps: number[] = [];

	let current = Math.floor(startTime / interval) * interval;

	while (current <= endTime) {
		if (current >= startTime) {
			timestamps.push(current);
		}
		current += interval;
	}

	return timestamps;
}

export function getThumbnailWidth({
	trackHeight,
}: {
	trackHeight: number;
}): number {
	return Math.round(trackHeight * (16 / 9));
}
