import EventEmitter from "eventemitter3";
import type { FilmstripFrame, FilmstripGenerationProgress } from "./types";
import { getTimestampsForRange } from "@/lib/timeline/filmstrip-utils";

const MAX_CACHE_SIZE = 150;

type CacheKey = string;

function createCacheKey({
	mediaId,
	timestamp,
	tier,
}: {
	mediaId: string;
	timestamp: number;
	tier: number;
}): CacheKey {
	return `${mediaId}:${tier}:${timestamp}`;
}

interface LRUCacheEntry {
	key: CacheKey;
	frame: FilmstripFrame;
}

export type FilmstripServiceEvents = {
	frame: [FilmstripGenerationProgress];
	error: [string, string];
};

export class FilmstripService extends EventEmitter<FilmstripServiceEvents> {
	private cache = new Map<CacheKey, LRUCacheEntry>();
	private cacheOrder: CacheKey[] = [];
	private worker: Worker | null = null;
	private pendingRequests = new Map<string, Map<number, number>>();

	private getWorker(): Worker {
		if (!this.worker) {
			this.worker = new Worker(new URL("./worker.ts", import.meta.url), {
				type: "module",
			});

			this.worker.onmessage = (event) => {
				const response = event.data;

				if (response.type === "frame") {
					const pending = this.pendingRequests.get(response.mediaId);
					const tier = pending?.get(response.timestamp);
					if (tier !== undefined) {
						this.handleFrame({
							mediaId: response.mediaId,
							timestamp: response.timestamp,
							dataUrl: response.dataUrl,
							tier,
						});
					}
				} else if (response.type === "error") {
					this.emit("error", response.mediaId, response.error);
				} else if (response.type === "cancelled") {
					this.pendingRequests.delete(response.mediaId);
				}
			};
		}

		return this.worker;
	}

	private handleFrame({
		mediaId,
		timestamp,
		dataUrl,
		tier,
	}: {
		mediaId: string;
		timestamp: number;
		dataUrl: string;
		tier: number;
	}): void {
		const pending = this.pendingRequests.get(mediaId);
		if (!pending || !pending.has(timestamp)) {
			return;
		}

		pending.delete(timestamp);
		if (pending.size === 0) {
			this.pendingRequests.delete(mediaId);
		}

		const frame: FilmstripFrame = {
			mediaId,
			timestamp,
			tier,
			dataUrl,
		};

		this.setFrame({ frame });
		this.emit("frame", { mediaId, timestamp, dataUrl });
	}

	private setFrame({ frame }: { frame: FilmstripFrame }): void {
		const key = createCacheKey({
			mediaId: frame.mediaId,
			timestamp: frame.timestamp,
			tier: frame.tier,
		});

		if (this.cache.has(key)) {
			this.moveToEnd({ key });
			return;
		}

		if (this.cache.size >= MAX_CACHE_SIZE) {
			this.evictOldest();
		}

		this.cache.set(key, { key, frame });
		this.cacheOrder.push(key);
	}

	private moveToEnd({ key }: { key: CacheKey }): void {
		const index = this.cacheOrder.indexOf(key);
		if (index !== -1) {
			this.cacheOrder.splice(index, 1);
			this.cacheOrder.push(key);
		}
	}

	private evictOldest(): void {
		const oldestKey = this.cacheOrder.shift();
		if (oldestKey) {
			this.cache.delete(oldestKey);
		}
	}

	getFrames({
		mediaId,
		tier,
		startTime,
		endTime,
	}: {
		mediaId: string;
		tier: number;
		startTime: number;
		endTime: number;
	}): FilmstripFrame[] {
		const timestamps = getTimestampsForRange({
			startTime,
			endTime,
			tier: tier as 0 | 1 | 2 | 3,
		});

		const frames: FilmstripFrame[] = [];

		for (const timestamp of timestamps) {
			const key = createCacheKey({ mediaId, timestamp, tier });
			const entry = this.cache.get(key);

			if (entry) {
				this.moveToEnd({ key });
				frames.push(entry.frame);
			}
		}

		return frames;
	}

	requestFrames({
		mediaId,
		file,
		timestamps,
		tier,
	}: {
		mediaId: string;
		file: File;
		timestamps: number[];
		tier: number;
	}): void {
		if (timestamps.length === 0) {
			return;
		}

		const pending = this.pendingRequests.get(mediaId) ?? new Map();
		const newTimestamps = timestamps.filter((ts) => !pending.has(ts));

		if (newTimestamps.length === 0) {
			return;
		}

		for (const timestamp of newTimestamps) {
			pending.set(timestamp, tier);
		}

		this.pendingRequests.set(mediaId, pending);

		const worker = this.getWorker();
		worker.postMessage({
			type: "extract",
			request: {
				mediaId,
				file,
				timestamps: newTimestamps,
			},
		});
	}

	clearMedia({ mediaId }: { mediaId: string }): void {
		const keysToDelete: CacheKey[] = [];

		for (const [key, entry] of this.cache) {
			if (entry.frame.mediaId === mediaId) {
				keysToDelete.push(key);
			}
		}

		for (const key of keysToDelete) {
			this.cache.delete(key);
			const index = this.cacheOrder.indexOf(key);
			if (index !== -1) {
				this.cacheOrder.splice(index, 1);
			}
		}

		this.cancelPending({ mediaId });
	}

	cancelPending({ mediaId }: { mediaId: string }): void {
		const pending = this.pendingRequests.get(mediaId);
		if (pending) {
			this.pendingRequests.delete(mediaId);

			const worker = this.getWorker();
			worker.postMessage({
				type: "cancel",
				mediaId,
			});
		}
	}

	destroy(): void {
		if (this.worker) {
			this.worker.terminate();
			this.worker = null;
		}
		this.cache.clear();
		this.cacheOrder = [];
		this.pendingRequests.clear();
	}
}

export const filmstripService = new FilmstripService();
