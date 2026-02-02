import { Input, ALL_FORMATS, BlobSource, VideoSampleSink } from "mediabunny";
import type { FilmstripRequest } from "./types";

const THUMBNAIL_WIDTH = 106;
const THUMBNAIL_HEIGHT = 60;
const JPEG_QUALITY = 0.6;

export type WorkerMessage =
	| { type: "extract"; request: FilmstripRequest }
	| { type: "cancel"; mediaId: string };

export type WorkerResponse =
	| {
			type: "frame";
			mediaId: string;
			timestamp: number;
			dataUrl: string;
	  }
	| { type: "error"; mediaId: string; error: string }
	| { type: "cancelled"; mediaId: string };

const cancelledMediaIds = new Set<string>();

self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
	const message = event.data;

	switch (message.type) {
		case "extract":
			await handleExtract({ request: message.request });
			break;
		case "cancel":
			cancelledMediaIds.add(message.mediaId);
			self.postMessage({
				type: "cancelled",
				mediaId: message.mediaId,
			} satisfies WorkerResponse);
			break;
	}
};

async function handleExtract({
	request,
}: {
	request: FilmstripRequest;
}): Promise<void> {
	const { mediaId, file, timestamps } = request;

	if (cancelledMediaIds.has(mediaId)) {
		cancelledMediaIds.delete(mediaId);
		return;
	}

	try {
		const input = new Input({
			source: new BlobSource(file),
			formats: ALL_FORMATS,
		});

		const videoTrack = await input.getPrimaryVideoTrack();
		if (!videoTrack) {
			self.postMessage({
				type: "error",
				mediaId,
				error: "No video track found",
			} satisfies WorkerResponse);
			return;
		}

		const canDecode = await videoTrack.canDecode();
		if (!canDecode) {
			self.postMessage({
				type: "error",
				mediaId,
				error: "Video codec not supported for decoding",
			} satisfies WorkerResponse);
			return;
		}

		const sink = new VideoSampleSink(videoTrack);

		for (const timestamp of timestamps) {
			if (cancelledMediaIds.has(mediaId)) {
				cancelledMediaIds.delete(mediaId);
				return;
			}

			const frame = await sink.getSample(timestamp);
			if (!frame) {
				continue;
			}

			try {
				const dataUrl = await renderFrameToDataUrl({ frame });
				self.postMessage({
					type: "frame",
					mediaId,
					timestamp,
					dataUrl,
				} satisfies WorkerResponse);
			} finally {
				frame.close();
			}
		}
	} catch (error) {
		self.postMessage({
			type: "error",
			mediaId,
			error:
				error instanceof Error ? error.message : "Failed to extract frames",
		} satisfies WorkerResponse);
	}
}

async function renderFrameToDataUrl({
	frame,
}: {
	frame: Awaited<ReturnType<VideoSampleSink["getSample"]>>;
}): Promise<string> {
	const canvas = new OffscreenCanvas(THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT);
	const context = canvas.getContext("2d");

	if (!context) {
		throw new Error("Could not get canvas context");
	}

	frame.draw(context, 0, 0, THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT);

	const blob = await canvas.convertToBlob({
		type: "image/jpeg",
		quality: JPEG_QUALITY,
	});

	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onloadend = () => {
			resolve(reader.result as string);
		};
		reader.onerror = reject;
		reader.readAsDataURL(blob);
	});
}
