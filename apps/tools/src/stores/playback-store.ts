import { create } from "zustand";
import { useTimelineStore } from "@/stores/timeline-store";
import { useProjectStore } from "./project-store";
import { DEFAULT_FPS } from "@/constants/editor-constants";

interface TPlaybackState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  speed: number;
  muted: boolean;
  previousVolume?: number;
}

interface TPlaybackControls {
  play: () => void;
  pause: () => void;
  seek: (time: number) => void;
  setVolume: (volume: number) => void;
  setSpeed: (speed: number) => void;
  toggle: () => void;
  mute: () => void;
  unmute: () => void;
  toggleMute: () => void;
}

interface TPlaybackStore extends TPlaybackState, TPlaybackControls {
  setDuration: (duration: number) => void;
  setCurrentTime: (time: number) => void;
}

let playbackTimer: number | null = null;

const startTimer = (store: () => TPlaybackStore) => {
  if (playbackTimer) cancelAnimationFrame(playbackTimer);

  // Use requestAnimationFrame for smoother updates
  const updateTime = () => {
    const state = store();
    if (state.isPlaying && state.currentTime < state.duration) {
      const now = performance.now();
      const delta = (now - lastUpdate) / 1000; // Convert to seconds
      lastUpdate = now;

      const newTime = state.currentTime + delta * state.speed;

      // Get actual content duration from timeline store
      const actualContentDuration = useTimelineStore
        .getState()
        .getTotalDuration();

      // Stop at actual content end, not timeline duration
      // It was either this or reducing default min timeline to 1 second
      const effectiveDuration =
        actualContentDuration > 0 ? actualContentDuration : state.duration;

      if (newTime >= effectiveDuration) {
        // When content completes, pause just before the end so we can see the last frame
        const projectFps = useProjectStore.getState().activeProject?.fps;
        if (!projectFps)
          console.error(
            "Project FPS is not set, assuming " + DEFAULT_FPS + "fps",
          );

        const frameOffset = 1 / (projectFps ?? DEFAULT_FPS); // Stop 1 frame before end based on project FPS
        const stopTime = Math.max(0, effectiveDuration - frameOffset);

        state.pause();
        state.setCurrentTime(stopTime);
        // Notify video elements to sync with end position
        window.dispatchEvent(
          new CustomEvent("playback-seek", {
            detail: { time: stopTime },
          }),
        );
      } else {
        state.setCurrentTime(newTime);
        // Notify video elements to sync
        window.dispatchEvent(
          new CustomEvent("playback-update", { detail: { time: newTime } }),
        );
      }
    }
    playbackTimer = requestAnimationFrame(updateTime);
  };

  let lastUpdate = performance.now();
  playbackTimer = requestAnimationFrame(updateTime);
};

const stopTimer = () => {
  if (playbackTimer) {
    cancelAnimationFrame(playbackTimer);
    playbackTimer = null;
  }
};

export const usePlaybackStore = create<TPlaybackStore>((set, get) => ({
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  volume: 1,
  muted: false,
  previousVolume: 1,
  speed: 1.0,

  play: () => {
    const state = get();

    const actualContentDuration = useTimelineStore
      .getState()
      .getTotalDuration();
    const effectiveDuration =
      actualContentDuration > 0 ? actualContentDuration : state.duration;

    if (effectiveDuration > 0) {
      const fps = useProjectStore.getState().activeProject?.fps ?? DEFAULT_FPS;
      const frameOffset = 1 / fps;
      const endThreshold = Math.max(0, effectiveDuration - frameOffset);

      if (state.currentTime >= endThreshold) {
        get().seek(0);
      }
    }

    set({ isPlaying: true });
    startTimer(get);
  },

  pause: () => {
    set({ isPlaying: false });
    stopTimer();
  },

  toggle: () => {
    const { isPlaying } = get();
    if (isPlaying) {
      get().pause();
    } else {
      get().play();
    }
  },

  seek: (time: number) => {
    const { duration } = get();
    const clampedTime = Math.max(0, Math.min(duration, time));
    set({ currentTime: clampedTime });

    const event = new CustomEvent("playback-seek", {
      detail: { time: clampedTime },
    });
    window.dispatchEvent(event);
  },

  setVolume: (volume: number) =>
    set((state) => ({
      volume: Math.max(0, Math.min(1, volume)),
      muted: volume === 0,
      previousVolume: volume > 0 ? volume : state.previousVolume,
    })),

  setSpeed: (speed: number) => {
  const newSpeed = Math.max(0.1, Math.min(2.0, speed));
    set({ speed: newSpeed });

    const event = new CustomEvent("playback-speed", {
      detail: { speed: newSpeed },
    });
    window.dispatchEvent(event);
  },

  setDuration: (duration: number) => set({ duration }),
  setCurrentTime: (time: number) => set({ currentTime: time }),

  mute: () => {
    const { volume, previousVolume } = get();
    set({
      muted: true,
      previousVolume: volume > 0 ? volume : previousVolume,
      volume: 0,
    });
  },

  unmute: () => {
    const { previousVolume } = get();
    set({ muted: false, volume: previousVolume ?? 1 });
  },

  toggleMute: () => {
    const { muted } = get();
    if (muted) {
      get().unmute();
    } else {
      get().mute();
    }
  },
}));
