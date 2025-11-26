import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CanvasPreset, PlatformLayout } from "@/types/editor";
import { DEFAULT_CANVAS_PRESETS } from "@/constants/editor-constants";

interface LayoutGuideSettings {
  platform: PlatformLayout | null;
}

interface EditorState {
  isInitializing: boolean;
  isPanelsReady: boolean;
  canvasPresets: CanvasPreset[];
  layoutGuide: LayoutGuideSettings;
  setInitializing: (loading: boolean) => void;
  setPanelsReady: (ready: boolean) => void;
  initializeApp: () => Promise<void>;
  setLayoutGuide: (settings: Partial<LayoutGuideSettings>) => void;
  toggleLayoutGuide: (platform: PlatformLayout) => void;
}

export const useEditorStore = create<EditorState>()(
  persist(
    (set) => ({
      isInitializing: true,
      isPanelsReady: false,
      canvasPresets: DEFAULT_CANVAS_PRESETS,
      layoutGuide: {
        platform: null,
      },
      setInitializing: (loading) => {
        set({ isInitializing: loading });
      },

      setPanelsReady: (ready) => {
        set({ isPanelsReady: ready });
      },

      initializeApp: async () => {
        console.log("Initializing video editor...");
        set({ isInitializing: true, isPanelsReady: false });

        set({ isPanelsReady: true, isInitializing: false });
        console.log("Video editor ready");
      },

      setLayoutGuide: (settings) => {
        set((state) => ({
          layoutGuide: {
            ...state.layoutGuide,
            ...settings,
          },
        }));
      },

      toggleLayoutGuide: (platform) => {
        set((state) => ({
          layoutGuide: {
            platform: state.layoutGuide.platform === platform ? null : platform,
          },
        }));
      },
    }),
    {
      name: "editor-settings",
      partialize: (state) => ({
        layoutGuide: state.layoutGuide,
      }),
    },
  ),
);
