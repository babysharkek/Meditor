import {
	CaptionsIcon,
	ArrowLeftRightIcon,
	SparklesIcon,
	StickerIcon,
	MusicIcon,
	VideoIcon,
	BlendIcon,
	SlidersHorizontalIcon,
	type LucideIcon,
	TypeIcon,
	SettingsIcon,
} from "lucide-react";
import { create } from "zustand";

export const TAB_KEYS = [
	"media",
	"sounds",
	"text",
	"stickers",
	"effects",
	"transitions",
	"captions",
	"filters",
	"adjustment",
	"settings",
] as const;

export type Tab = (typeof TAB_KEYS)[number];

export const tabs = {
	media: {
		icon: VideoIcon,
		label: "Media",
	},
	sounds: {
		icon: MusicIcon,
		label: "Sounds",
	},
	text: {
		icon: TypeIcon,
		label: "Text",
	},
	stickers: {
		icon: StickerIcon,
		label: "Stickers",
	},
	effects: {
		icon: SparklesIcon,
		label: "Effects",
	},
	transitions: {
		icon: ArrowLeftRightIcon,
		label: "Transitions",
	},
	captions: {
		icon: CaptionsIcon,
		label: "Captions",
	},
	filters: {
		icon: BlendIcon,
		label: "Filters",
	},
	adjustment: {
		icon: SlidersHorizontalIcon,
		label: "Adjustment",
	},
	settings: {
		icon: SettingsIcon,
		label: "Settings",
	},
} satisfies Record<Tab, { icon: LucideIcon; label: string }>;

type MediaViewMode = "grid" | "list";

interface AssetsPanelStore {
	activeTab: Tab;
	setActiveTab: (tab: Tab) => void;
	highlightMediaId: string | null;
	requestRevealMedia: (mediaId: string) => void;
	clearHighlight: () => void;

	/* Media */
	mediaViewMode: MediaViewMode;
	setMediaViewMode: (mode: MediaViewMode) => void;
}

export const useAssetsPanelStore = create<AssetsPanelStore>((set) => ({
	activeTab: "media",
	setActiveTab: (tab) => set({ activeTab: tab }),
	highlightMediaId: null,
	requestRevealMedia: (mediaId) =>
		set({ activeTab: "media", highlightMediaId: mediaId }),
	clearHighlight: () => set({ highlightMediaId: null }),
	mediaViewMode: "grid",
	setMediaViewMode: (mode) => set({ mediaViewMode: mode }),
}));
