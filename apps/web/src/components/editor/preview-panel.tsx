"use client";

import useDeepCompareEffect from "use-deep-compare-effect";
import { useCallback, useMemo, useRef } from "react";
import { useRafLoop } from "@/hooks/use-raf-loop";
import { RootNode } from "@/services/renderer/nodes/root-node";
import { CanvasRenderer } from "@/services/renderer/canvas-renderer";
import { useMediaStore } from "@/stores/media-store";
import { usePlaybackStore } from "@/stores/playback-store";
import { useRendererStore } from "@/stores/renderer-store";
import { useTimelineStore } from "@/stores/timeline-store";
import { useProjectStore } from "@/stores/project-store";
import { DEFAULT_FPS } from "@/constants/editor-constants";
import { buildScene } from "@/services/renderer/scene-builder";

function usePreviewSize() {
  const { activeProject } = useProjectStore();
  return {
    width: activeProject?.canvasSize?.width || 600,
    height: activeProject?.canvasSize?.height || 320,
  };
}

function RenderTreeController() {
  const setRenderTree = useRendererStore((s) => s.setRenderTree);
  const tracks = useTimelineStore((s) => s.tracks);
  const mediaFiles = useMediaStore((s) => s.mediaFiles);
  const getTotalDuration = useTimelineStore((s) => s.getTotalDuration);
  const { activeProject } = useProjectStore();
  const { width, height } = usePreviewSize();

  useDeepCompareEffect(() => {
    if (!activeProject) return;

    const renderTree = buildScene({
      tracks,
      mediaFiles,
      duration: getTotalDuration(),
      canvasSize: {
        width,
        height,
      },
      backgroundColor:
        activeProject.backgroundType === "blur"
          ? "transparent"
          : activeProject.backgroundColor || "#000000",
      backgroundType: activeProject.backgroundType,
      blurIntensity: activeProject.blurIntensity,
    });

    setRenderTree(renderTree);
  }, [
    tracks,
    mediaFiles,
    getTotalDuration,
    activeProject?.backgroundColor,
    activeProject?.backgroundType,
    activeProject?.blurIntensity,
    width,
    height,
  ]);

  return null;
}

export function PreviewPanel() {
  return (
    <div className="bg-panel relative flex h-full min-h-0 w-full min-w-0 flex-col rounded-sm">
      <div className="flex min-h-0 min-w-0 flex-1 items-center justify-center p-2">
        <PreviewCanvas />
        <RenderTreeController />
      </div>
    </div>
  );
}

function PreviewCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);
  const lastFrameRef = useRef(-1);
  const lastSceneRef = useRef<RootNode | null>(null);
  const renderingRef = useRef(false);
  const { width, height } = usePreviewSize();
  const { activeProject } = useProjectStore();

  const renderer = useMemo(() => {
    return new CanvasRenderer({
      width,
      height,
      fps: activeProject?.fps || DEFAULT_FPS,
    });
  }, [width, height, activeProject?.fps]);

  const renderTree = useRendererStore((s) => s.renderTree);

  const render = useCallback(() => {
    if (ref.current && renderTree && !renderingRef.current) {
      const time = usePlaybackStore.getState().currentTime;
      const frame = Math.floor(time * renderer.fps);

      if (
        frame !== lastFrameRef.current ||
        renderTree !== lastSceneRef.current
      ) {
        renderingRef.current = true;
        lastSceneRef.current = renderTree;
        lastFrameRef.current = frame;
        renderer
          .renderToCanvas({ node: renderTree, time, targetCanvas: ref.current })
          .then(() => {
            renderingRef.current = false;
          });
      }
    }
  }, [renderer, renderTree]);

  useRafLoop(render);

  return (
    <canvas
      ref={ref}
      width={width}
      height={height}
      className="block max-h-full max-w-full border"
      style={{
        background:
          activeProject?.backgroundType === "blur"
            ? "transparent"
            : activeProject?.backgroundColor || "#000000",
      }}
    />
  );
}
