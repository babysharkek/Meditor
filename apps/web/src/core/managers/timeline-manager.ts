import type { EditorCore } from "@/core";
import type {
  TrackType,
  CreateTimelineElement,
  TimelineTrack,
  TextElement,
  TimelineElement,
} from "@/types/timeline";
import { calculateTotalDuration } from "@/lib/timeline";
import { storageService } from "@/lib/storage/storage-service";
import {
  AddTrackCommand,
  RemoveTrackCommand,
  ToggleTrackMuteCommand,
  AddElementToTrackCommand,
  UpdateElementTrimCommand,
  UpdateElementDurationCommand,
  DeleteElementsCommand,
  DuplicateElementsCommand,
  ToggleElementsHiddenCommand,
  ToggleElementsMutedCommand,
  UpdateTextElementCommand,
  SplitElementsCommand,
  PasteCommand,
  UpdateElementStartTimeCommand,
  MoveElementCommand,
} from "@/lib/commands/timeline";

export class TimelineManager {
  public sortedTracks: TimelineTrack[] = [];
  private listeners = new Set<() => void>();

  constructor(private editor: EditorCore) {
    this.initializeTracks();
  }

  private initializeTracks(): void {
    this.sortedTracks = [];
  }

  addTrack({ type, index }: { type: TrackType; index?: number }): string {
    const command = new AddTrackCommand(type, index);
    this.editor.command.execute({ command });
    return command.getTrackId();
  }

  removeTrack({ trackId }: { trackId: string }): void {
    const command = new RemoveTrackCommand(trackId);
    this.editor.command.execute({ command });
  }

  addElementToTrack({
    trackId,
    element,
  }: {
    trackId: string;
    element: CreateTimelineElement;
  }): void {
    const command = new AddElementToTrackCommand(trackId, element);
    this.editor.command.execute({ command });
  }

  updateElementTrim({
    trackId,
    elementId,
    trimStart,
    trimEnd,
    pushHistory = true,
  }: {
    trackId: string;
    elementId: string;
    trimStart: number;
    trimEnd: number;
    pushHistory?: boolean;
  }): void {
    const command = new UpdateElementTrimCommand(
      trackId,
      elementId,
      trimStart,
      trimEnd,
    );
    if (pushHistory) {
      this.editor.command.execute({ command });
    } else {
      command.execute();
    }
  }

  updateElementDuration({
    trackId,
    elementId,
    duration,
    pushHistory = true,
  }: {
    trackId: string;
    elementId: string;
    duration: number;
    pushHistory?: boolean;
  }): void {
    const command = new UpdateElementDurationCommand(
      trackId,
      elementId,
      duration,
    );
    if (pushHistory) {
      this.editor.command.execute({ command });
    } else {
      command.execute();
    }
  }

  updateElementStartTime({
    elements,
    startTime,
  }: {
    elements: { trackId: string; elementId: string }[];
    startTime: number;
  }): void {
    const command = new UpdateElementStartTimeCommand(elements, startTime);
    this.editor.command.execute({ command });
  }

  moveElement({
    sourceTrackId,
    targetTrackId,
    elementId,
    newStartTime,
  }: {
    sourceTrackId: string;
    targetTrackId: string;
    elementId: string;
    newStartTime: number;
  }): void {
    const command = new MoveElementCommand(
      sourceTrackId,
      targetTrackId,
      elementId,
      newStartTime,
    );
    this.editor.command.execute({ command });
  }

  toggleTrackMute({ trackId }: { trackId: string }): void {
    const command = new ToggleTrackMuteCommand(trackId);
    this.editor.command.execute({ command });
  }

  splitElements({
    elements,
    splitTime,
    retainSide = "both",
  }: {
    elements: { trackId: string; elementId: string }[];
    splitTime: number;
    retainSide?: "both" | "left" | "right";
  }): void {
    const command = new SplitElementsCommand(elements, splitTime, retainSide);
    this.editor.command.execute({ command });
  }

  getTotalDuration(): number {
    return calculateTotalDuration({ tracks: this.sortedTracks });
  }

  getTrackById({ trackId }: { trackId: string }): TimelineTrack | null {
    return this.sortedTracks.find((track) => track.id === trackId) ?? null;
  }

  getElementsWithTracks({
    elements,
  }: {
    elements:
      | { trackId: string; elementId: string }[]
      | { trackId: string; elementId: string };
  }):
    | Array<{ track: TimelineTrack; element: TimelineElement }>
    | { track: TimelineTrack; element: TimelineElement }
    | null {
    const normalized = Array.isArray(elements) ? elements : [elements];
    const result: Array<{ track: TimelineTrack; element: TimelineElement }> =
      [];

    for (const { trackId, elementId } of normalized) {
      const track = this.getTrackById({ trackId });
      const element = track?.elements.find((el) => el.id === elementId);

      if (track && element) {
        result.push({ track, element });
      }
    }

    return Array.isArray(elements) ? result : (result[0] ?? null);
  }

  async loadProjectTimeline({
    projectId,
    sceneId,
  }: {
    projectId: string;
    sceneId?: string;
  }): Promise<void> {
    try {
      const tracks = await storageService.loadTimeline({
        projectId,
        sceneId,
      });

      if (tracks) {
        this.updateTracks(tracks);
      }
    } catch (error) {
      console.error("Failed to load timeline:", error);
      throw error;
    }
  }

  async saveProjectTimeline({
    projectId,
    sceneId,
  }: {
    projectId: string;
    sceneId?: string;
  }): Promise<void> {
    try {
      await storageService.saveTimeline({
        projectId,
        tracks: this.sortedTracks,
        sceneId,
      });
    } catch (error) {
      console.error("Failed to save timeline:", error);
      throw error;
    }
  }

  clearTimeline(): void {
    this.updateTracks([]);
  }

  pasteAtTime({ time }: { time: number }): void {
    const command = new PasteCommand(time);
    this.editor.command.execute({ command });
  }

  deleteElements({
    elements,
  }: {
    elements: { trackId: string; elementId: string }[];
  }): void {
    const command = new DeleteElementsCommand(elements);
    this.editor.command.execute({ command });
  }

  updateTextElement({
    trackId,
    elementId,
    updates,
  }: {
    trackId: string;
    elementId: string;
    updates: Partial<
      Pick<
        TextElement,
        | "content"
        | "fontSize"
        | "fontFamily"
        | "color"
        | "backgroundColor"
        | "textAlign"
        | "fontWeight"
        | "fontStyle"
        | "textDecoration"
      >
    >;
  }): void {
    const command = new UpdateTextElementCommand(trackId, elementId, updates);
    this.editor.command.execute({ command });
  }

  duplicateElements({
    elements,
  }: {
    elements: { trackId: string; elementId: string }[];
  }): void {
    const command = new DuplicateElementsCommand({ elements });
    this.editor.command.execute({ command });
  }

  toggleElementsHidden({
    elements,
  }: {
    elements: { trackId: string; elementId: string }[];
  }): void {
    const command = new ToggleElementsHiddenCommand(elements);
    this.editor.command.execute({ command });
  }

  toggleElementsMuted({
    elements,
  }: {
    elements: { trackId: string; elementId: string }[];
  }): void {
    const command = new ToggleElementsMutedCommand(elements);
    this.editor.command.execute({ command });
  }

  checkElementOverlap({
    trackId,
    startTime,
    duration,
    excludeElementId,
  }: {
    trackId: string;
    startTime: number;
    duration: number;
    excludeElementId?: string;
  }): boolean {
    throw new Error("Not implemented");
  }

  getTracks(): TimelineTrack[] {
    return this.sortedTracks;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach((fn) => fn());
  }

  updateTracks(newTracks: TimelineTrack[]): void {
    this.sortedTracks = newTracks;
    this.notify();
  }
}
