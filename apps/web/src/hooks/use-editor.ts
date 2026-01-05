import { useEffect, useMemo, useReducer } from "react";
import { EditorCore } from "@/core";

export function useEditor(): EditorCore {
  const editor = useMemo(() => EditorCore.getInstance(), []);
  const [, forceUpdate] = useReducer((x) => x + 1, 0);

  useEffect(() => {
    const unsubscribers = [
      editor.playback.subscribe(forceUpdate),
      editor.timeline.subscribe(forceUpdate),
      editor.scene.subscribe(forceUpdate),
      editor.project.subscribe(forceUpdate),
      editor.media.subscribe(forceUpdate),
      editor.renderer.subscribe(forceUpdate),
    ];

    return () => unsubscribers.forEach((unsub) => unsub());
  }, [editor]);

  return editor;
}
