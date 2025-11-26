import { create } from "zustand";
import { SceneNode } from "@/services/renderer/nodes/root-node";

interface RendererStore {
  renderTree: SceneNode | null;
  setRenderTree: (renderTree: SceneNode | null) => void;
}

export const useRendererStore = create<RendererStore>((set) => ({
  renderTree: null,
  setRenderTree: (renderTree) => set({ renderTree }),
}));
