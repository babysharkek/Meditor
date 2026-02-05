"use client";

import React, { useState, useEffect } from "react";
import { useEditor } from "@/hooks/use-editor";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription } from "@/components/ui/dialog";
import type { TextElement } from "@/types/timeline";

const FONT_FAMILIES = [
	"Arial",
	"Helvetica",
	"Times New Roman",
	"Georgia",
	"Courier New",
	"Verdana",
	"Comic Sans MS",
	"Impact",
];

const ALIGNMENTS = [
	{ value: "left", label: "Left" },
	{ value: "center", label: "Center" },
	{ value: "right", label: "Right" },
] as const;

const FONT_WEIGHTS = [
	{ value: "normal", label: "Normal" },
	{ value: "bold", label: "Bold" },
] as const;

const FONT_STYLES = [
	{ value: "normal", label: "Normal" },
	{ value: "italic", label: "Italic" },
] as const;

export function TextPropertiesPanel() {
	const editor = useEditor();
	const [selectedTextElement, setSelectedTextElement] = useState<TextElement | null>(null);

	useEffect(() => {
		const currentTime = editor.playback.getCurrentTime();
		const tracks = editor.timeline.getTracks();

		// Find first text element at current playback time
		for (const track of tracks) {
			if (track.type !== "text") continue;
			for (const element of track.elements) {
				if (element.type === "text" && currentTime >= element.startTime && currentTime <= element.startTime + element.duration) {
					setSelectedTextElement(element);
					return;
				}
			}
		}
		setSelectedTextElement(null);
	}, [editor]);

	const updateElement = (updates: Partial<TextElement>) => {
		if (!selectedTextElement) return;

		const tracks = editor.timeline.getTracks();
		const track = tracks.find((t) => t.type === "text");
		if (!track) return;

		const updatedElements = track.elements.map((el) =>
			el.id === selectedTextElement.id ? { ...el, ...updates } : el
		);

		editor.timeline.updateTracks([
			...tracks.filter((t) => t.type !== "text"),
			{ ...track, elements: updatedElements },
		]);
	};

	if (!selectedTextElement) {
		return null;
	}

	return (
		<Dialog open={true}>
			<DialogContent>
				<DialogDescription>Edit text properties</DialogDescription>
				<div className="flex flex-col gap-3">
					{/* Content */}
					<div>
						<Label htmlFor="content" className="text-xs">Content</Label>
						<Textarea
							id="content"
							value={selectedTextElement.content}
							onChange={(e) => updateElement({ content: e.target.value })}
							className="min-h-[60px] resize-none"
						/>
					</div>

					{/* Font Family */}
					<div>
						<Label className="text-xs">Font Family</Label>
						<Select
							value={selectedTextElement.fontFamily}
							onValueChange={(value) => updateElement({ fontFamily: value })}
						>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{FONT_FAMILIES.map((font) => (
									<SelectItem key={font} value={font}>
										{font}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					{/* Font Size */}
					<div>
						<Label htmlFor="fontSize" className="text-xs">Font Size</Label>
						<Input
							id="fontSize"
							type="number"
							value={selectedTextElement.fontSize}
							onChange={(e) => updateElement({ fontSize: Number(e.target.value) })}
						/>
					</div>

					{/* Color */}
					<div>
						<Label htmlFor="color" className="text-xs">Text Color</Label>
						<div className="flex gap-2">
							<Input
								id="color"
								type="color"
								value={selectedTextElement.color}
								onChange={(e) => updateElement({ color: e.target.value })}
								className="w-12 h-8 p-1"
							/>
							<Input
								value={selectedTextElement.color}
								onChange={(e) => updateElement({ color: e.target.value })}
								placeholder="#ffffff"
							/>
						</div>
					</div>

					{/* Background Color */}
					<div>
						<Label htmlFor="bgColor" className="text-xs">Background Color</Label>
						<div className="flex gap-2">
							<Input
								id="bgColor"
								type="color"
								value={selectedTextElement.backgroundColor === "transparent" ? "#000000" : selectedTextElement.backgroundColor}
								onChange={(e) => updateElement({ backgroundColor: e.target.value })}
								className="w-12 h-8 p-1"
							/>
							<Input
								value={selectedTextElement.backgroundColor}
								onChange={(e) => updateElement({ backgroundColor: e.target.value })}
								placeholder="transparent"
							/>
						</div>
					</div>

					{/* Text Align */}
					<div>
						<Label className="text-xs">Alignment</Label>
						<Select
							value={selectedTextElement.textAlign}
							onValueChange={(value: any) => updateElement({ textAlign: value })}
						>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{ALIGNMENTS.map(({ value, label }) => (
									<SelectItem key={value} value={value}>
										{label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					{/* Font Weight */}
					<div>
						<Label className="text-xs">Weight</Label>
						<Select
							value={selectedTextElement.fontWeight}
							onValueChange={(value: any) => updateElement({ fontWeight: value })}
						>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{FONT_WEIGHTS.map(({ value, label }) => (
									<SelectItem key={value} value={value}>
										{label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					{/* Font Style */}
					<div>
						<Label className="text-xs">Style</Label>
						<Select
							value={selectedTextElement.fontStyle}
							onValueChange={(value: any) => updateElement({ fontStyle: value })}
						>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{FONT_STYLES.map(({ value, label }) => (
									<SelectItem key={value} value={value}>
										{label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					{/* Reset to defaults */}
					<Button
						variant="outline"
						size="sm"
						onClick={() => {
							updateElement({
								fontSize: 48,
								fontFamily: "Arial",
								color: "#ffffff",
								backgroundColor: "transparent",
								textAlign: "center",
								fontWeight: "normal",
								fontStyle: "normal",
							});
						}}
					>
						Reset to Defaults
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}
