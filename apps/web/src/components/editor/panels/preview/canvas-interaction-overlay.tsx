"use client";

import React, { useEffect, useRef, useState } from "react";
import { useEditor } from "@/hooks/use-editor";
import { cn } from "@/utils/ui";
import type { TextElement, TimelineTrack } from "@/types/timeline";

// eslint-disable-next-line @typescript-eslint/no-namespace
namespace JSX {
	interface IntrinsicElements {
		div: React.DetailedHTMLProps<React.HTMLAttributes<HTMLDivElement>, HTMLDivElement>;
	}
}

interface Point {
	x: number;
	y: number;
}

interface DragState {
	isDragging: boolean;
	elementId: string | null;
	trackId: string | null;
	startOffset: Point;
	initialTransformPos: Point;
}

export function CanvasInteractionOverlay({
	canvasSize,
}: {
	canvasSize: { width: number; height: number };
}) {
	const overlayRef = useRef<HTMLDivElement>(null);
	const editor = useEditor();
	const [dragState, setDragState] = useState<DragState>({
		isDragging: false,
		elementId: null,
		trackId: null,
		startOffset: { x: 0, y: 0 },
		initialTransformPos: { x: 0, y: 0 },
	});

	/** Convert pointer event to canvas-relative coordinates */
	function pointerToCanvasPoint(e: React.PointerEvent): Point {
		if (!overlayRef.current) return { x: 0, y: 0 };
		const rect = overlayRef.current.getBoundingClientRect();
		const scaleX = canvasSize.width / rect.width;
		const scaleY = canvasSize.height / rect.height;
		return {
			x: (e.clientX - rect.left) * scaleX,
			y: (e.clientY - rect.top) * scaleY,
		};
	}

	/** Hit-test: find a text element under the pointer */
	function getTextElementAt(point: Point): { elementId: string; trackId: string } | null {
		const tracks = editor.timeline.getTracks() as TimelineTrack[];
		const time = editor.playback.getCurrentTime();

		for (const track of tracks) {
			if (track.type !== "text") continue;
			for (const element of track.elements) {
				if (time < element.startTime || time >= element.startTime + element.duration) continue;

				// Rough bounding-box hit test (centered at transform.position)
				// TODO: use actual text metrics for tighter bounds
				const fontSize = element.fontSize || 48;
				const halfW = fontSize * 4; // crude estimate
				const halfH = fontSize / 2;
				const cx = canvasSize.width / 2 + element.transform.position.x;
				const cy = canvasSize.height / 2 + element.transform.position.y;
				if (
					point.x >= cx - halfW &&
					point.x <= cx + halfW &&
					point.y >= cy - halfH &&
					point.y <= cy + halfH
				) {
					return { elementId: element.id, trackId: track.id };
				}
			}
		}
		return null;
	}

	/** Update element transform.position */
	function updateElementPosition({
		trackId,
		elementId,
		newPosition,
	}: {
		trackId: string;
		elementId: string;
		newPosition: Point;
	}) {
		// For now, directly mutate via timeline manager (TODO: wrap in command for undo/redo)
		const tracks = editor.timeline.getTracks() as TimelineTrack[];
		const updatedTracks = tracks.map((track) => {
			if (track.id !== trackId) return track;
			if (track.type !== "text") return track;
			const newElements = track.elements.map((el) =>
				el.id === elementId
					? {
							...el,
							transform: {
								...el.transform,
								position: newPosition,
							},
						}
					: el
			);
			return { ...track, elements: newElements };
		}) as TimelineTrack[];
		editor.timeline.updateTracks(updatedTracks);
	}

	function handlePointerDown(e: React.PointerEvent) {
		const point = pointerToCanvasPoint(e);
		const hit = getTextElementAt(point);
		if (!hit) return;

		const tracks = editor.timeline.getTracks() as TimelineTrack[];
		const track = tracks.find((t) => t.id === hit.trackId);
		if (!track || track.type !== "text") return;
		const element = track.elements.find((el) => el.id === hit.elementId) as TextElement;
		if (!element) return;

		setDragState({
			isDragging: true,
			elementId: hit.elementId,
			trackId: hit.trackId,
			startOffset: {
				x: point.x - (canvasSize.width / 2 + element.transform.position.x),
				y: point.y - (canvasSize.height / 2 + element.transform.position.y),
			},
			initialTransformPos: { ...element.transform.position },
		});

		e.currentTarget.setPointerCapture(e.pointerId);
	}

	function handlePointerMove(e: React.PointerEvent) {
		if (!dragState.isDragging || !dragState.elementId || !dragState.trackId) return;

		const point = pointerToCanvasPoint(e);
		const newPos = {
			x: point.x - canvasSize.width / 2 - dragState.startOffset.x,
			y: point.y - canvasSize.height / 2 - dragState.startOffset.y,
		};

		updateElementPosition({
			trackId: dragState.trackId,
			elementId: dragState.elementId,
			newPosition: newPos,
		});
	}

	function handlePointerUp(e: React.PointerEvent) {
		setDragState({
			isDragging: false,
			elementId: null,
			trackId: null,
			startOffset: { x: 0, y: 0 },
			initialTransformPos: { x: 0, y: 0 },
		});
		e.currentTarget.releasePointerCapture(e.pointerId);
	}

	return (
		<div
			ref={overlayRef}
			className={cn(
				"absolute inset-0",
				dragState.isDragging ? "cursor-grabbing" : "cursor-auto"
			)}
			onPointerDown={handlePointerDown}
			onPointerMove={handlePointerMove}
			onPointerUp={handlePointerUp}
			onPointerLeave={handlePointerUp}
		/>
	);
}
