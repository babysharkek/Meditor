"use client";

import { useTimelineStore } from "@/stores/timeline-store";
import { useActionHandler } from "@/hooks/actions/use-action-handler";
import { useEditor } from "../use-editor";
import { PasteCommand } from "@/lib/commands/timeline/clipboard/paste";
import { toast } from "sonner";
import { useElementSelection } from "../timeline/element/use-element-selection";

export function useEditorActions() {
  const editor = useEditor();
  const activeProject = editor.project.getActive();
  const { selectedElements, setElementSelection } = useElementSelection();
  const { clipboard, setClipboard, toggleSnapping } = useTimelineStore();

  useActionHandler(
    "toggle-play",
    () => {
      editor.playback.toggle();
    },
    undefined,
  );

  useActionHandler(
    "stop-playback",
    () => {
      if (editor.playback.getIsPlaying()) {
        editor.playback.toggle();
      }
      editor.playback.seek({ time: 0 });
    },
    undefined,
  );

  useActionHandler(
    "seek-forward",
    (args) => {
      const seconds = args?.seconds ?? 1;
      editor.playback.seek({
        time: Math.min(
          editor.timeline.getTotalDuration(),
          editor.playback.getCurrentTime() + seconds,
        ),
      });
    },
    undefined,
  );

  useActionHandler(
    "seek-backward",
    (args) => {
      const seconds = args?.seconds ?? 1;
      editor.playback.seek({
        time: Math.max(0, editor.playback.getCurrentTime() - seconds),
      });
    },
    undefined,
  );

  useActionHandler(
    "frame-step-forward",
    () => {
      const fps = activeProject.settings.fps;
      editor.playback.seek({
        time: Math.min(
          editor.timeline.getTotalDuration(),
          editor.playback.getCurrentTime() + 1 / fps,
        ),
      });
    },
    undefined,
  );

  useActionHandler(
    "frame-step-backward",
    () => {
      const fps = activeProject.settings.fps;
      editor.playback.seek({
        time: Math.max(0, editor.playback.getCurrentTime() - 1 / fps),
      });
    },
    undefined,
  );

  useActionHandler(
    "jump-forward",
    (args) => {
      const seconds = args?.seconds ?? 5;
      editor.playback.seek({
        time: Math.min(
          editor.timeline.getTotalDuration(),
          editor.playback.getCurrentTime() + seconds,
        ),
      });
    },
    undefined,
  );

  useActionHandler(
    "jump-backward",
    (args) => {
      const seconds = args?.seconds ?? 5;
      editor.playback.seek({
        time: Math.max(0, editor.playback.getCurrentTime() - seconds),
      });
    },
    undefined,
  );

  useActionHandler(
    "goto-start",
    () => {
      editor.playback.seek({ time: 0 });
    },
    undefined,
  );

  useActionHandler(
    "goto-end",
    () => {
      editor.playback.seek({ time: editor.timeline.getTotalDuration() });
    },
    undefined,
  );

  useActionHandler(
    "split-selected",
    () => {
      const splitElementIds = editor.timeline.splitElements({
        elements: selectedElements,
        splitTime: editor.playback.getCurrentTime(),
      });

      if (splitElementIds.length === 0) {
        toast.error("Playhead must be positioned over the selected element(s)");
      }
    },
    undefined,
  );

  useActionHandler(
    "split-selected-left",
    () => {
      const splitElementIds = editor.timeline.splitElements({
        elements: selectedElements,
        splitTime: editor.playback.getCurrentTime(),
        retainSide: "left",
      });

      if (splitElementIds.length === 0) {
        toast.error("Playhead must be positioned over the selected element(s)");
      }
    },
    undefined,
  );

  useActionHandler(
    "split-selected-right",
    () => {
      const splitElementIds = editor.timeline.splitElements({
        elements: selectedElements,
        splitTime: editor.playback.getCurrentTime(),
        retainSide: "right",
      });

      if (splitElementIds.length === 0) {
        toast.error("Playhead must be positioned over the selected element(s)");
      }
    },
    undefined,
  );

  useActionHandler(
    "delete-selected",
    () => {
      if (selectedElements.length === 0) {
        return;
      }
      editor.timeline.deleteElements({
        elements: selectedElements,
      });
    },
    undefined,
  );

  useActionHandler(
    "select-all",
    () => {
      const allElements = editor.timeline.getTracks().flatMap((track) =>
        track.elements.map((element) => ({
          trackId: track.id,
          elementId: element.id,
        })),
      );
      setElementSelection({ elements: allElements });
    },
    undefined,
  );

  useActionHandler(
    "duplicate-selected",
    () => {
      editor.timeline.duplicateElements({ elements: selectedElements });
    },
    undefined,
  );

  useActionHandler(
    "toggle-elements-muted-selected",
    () => {
      editor.timeline.toggleElementsMuted({ elements: selectedElements });
    },
    undefined,
  );

  useActionHandler(
    "toggle-elements-visibility-selected",
    () => {
      editor.timeline.toggleElementsVisibility({ elements: selectedElements });
    },
    undefined,
  );

  useActionHandler(
    "toggle-bookmark",
    () => {
      editor.scenes.toggleBookmark({ time: editor.playback.getCurrentTime() });
    },
    undefined,
  );

  useActionHandler(
    "copy-selected",
    () => {
      if (selectedElements.length === 0) return;

      const results = editor.timeline.getElementsWithTracks({
        elements: selectedElements,
      });
      const items = results.map(({ track, element }) => {
        const { id, ...elementWithoutId } = element;
        return {
          trackType: track.type,
          element: elementWithoutId,
        };
      });

      setClipboard({ items });
    },
    undefined,
  );

  useActionHandler(
    "paste-selected",
    () => {
      if (!clipboard?.items.length) return;

      const currentTime = editor.playback.getCurrentTime();
      editor.command.execute({
        command: new PasteCommand(currentTime, clipboard.items),
      });
    },
    undefined,
  );

  useActionHandler(
    "toggle-snapping",
    () => {
      toggleSnapping();
    },
    undefined,
  );

  useActionHandler(
    "undo",
    () => {
      editor.command.undo();
    },
    undefined,
  );

  useActionHandler(
    "redo",
    () => {
      editor.command.redo();
    },
    undefined,
  );
}
