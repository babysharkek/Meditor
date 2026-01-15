"use client";

import { useTimelineStore } from "@/stores/timeline-store";
import { ScrollArea } from "../../ui/scroll-area";
import { AudioProperties } from "./audio-properties";
import { VideoProperties } from "./video-properties";
import { TextProperties } from "./text-properties";
import { SquareSlashIcon } from "lucide-react";
import { useEditor } from "@/hooks/use-editor";

export function PropertiesPanel() {
  const { selectedElements } = useTimelineStore();

  const editor = useEditor();

  const elementsWithTracks = editor.timeline.getElementsWithTracks({
    elements: selectedElements,
  });

  return (
    <>
      {selectedElements.length > 0 ? (
        <ScrollArea className="bg-panel h-full rounded-sm">
          {elementsWithTracks.map(({ track, element }) => {
            if (element.type === "text") {
              return (
                <div key={element.id}>
                  <TextProperties element={element} trackId={track.id} />
                </div>
              );
            }
            if (element.type === "audio") {
              return <AudioProperties key={element.id} element={element} />;
            }
            if (element.type === "video" || element.type === "image") {
              return (
                <div key={element.id}>
                  <VideoProperties element={element} />
                </div>
              );
            }
            return null;
          })}
        </ScrollArea>
      ) : (
        <EmptyView />
      )}
    </>
  );
}

function EmptyView() {
  return (
    <div className="bg-panel flex h-full flex-col items-center justify-center gap-3 p-4">
      <SquareSlashIcon
        className="text-muted-foreground h-10 w-10"
        strokeWidth={1.5}
      />
      <div className="flex flex-col gap-2 text-center">
        <p className="text-lg font-medium">It’s empty here</p>
        <p className="text-muted-foreground text-balance text-sm">
          Click an element on the timeline to edit its properties
        </p>
      </div>
    </div>
  );
}
