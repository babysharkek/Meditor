/**
 * UI state for the timeline
 * For core logic, use EditorCore instead.
 */

import { create } from "zustand";
import type { TrackType, CreateTimelineElement } from "@/types/timeline";

interface TimelineStore {
  selectedElements: { trackId: string; elementId: string }[];
  setSelectedElements: ({
    elements,
  }: {
    elements: { trackId: string; elementId: string }[];
  }) => void;
  snappingEnabled: boolean;
  toggleSnapping: () => void;
  rippleEditingEnabled: boolean;
  toggleRippleEditing: () => void;
  clipboard: {
    items: Array<{ trackType: TrackType; element: CreateTimelineElement }>;
  } | null;
  setClipboard: (
    clipboard: {
      items: Array<{ trackType: TrackType; element: CreateTimelineElement }>;
    } | null,
  ) => void;
}

export const useTimelineStore = create<TimelineStore>((set) => ({
  selectedElements: [],

  setSelectedElements: ({ elements }) => {
    set({ selectedElements: elements });
  },

  snappingEnabled: true,

  toggleSnapping: () => {
    set((state) => ({ snappingEnabled: !state.snappingEnabled }));
  },

  rippleEditingEnabled: false,

  toggleRippleEditing: () => {
    set((state) => ({
      rippleEditingEnabled: !state.rippleEditingEnabled,
    }));
  },

  clipboard: null,

  setClipboard: (clipboard) => {
    set({ clipboard });
  },
}));
