"use client";

import { TabBar } from "./tabbar";
import { MediaView } from "./views/media";
import { useAssetsPanelStore, Tab } from "../../../stores/assets-panel-store";
import { TextView } from "./views/text";
import { SoundsView } from "./views/sounds";
import { StickersView } from "./views/stickers";
import { Separator } from "@/components/ui/separator";
import { SettingsView } from "./views/settings";
import { Captions } from "./views/captions";

export function AssetsPanel() {
  const { activeTab } = useAssetsPanelStore();

  const viewMap: Record<Tab, React.ReactNode> = {
    media: <MediaView />,
    sounds: <SoundsView />,
    text: <TextView />,
    stickers: <StickersView />,
    effects: (
      <div className="text-muted-foreground p-4">
        Effects view coming soon...
      </div>
    ),
    transitions: (
      <div className="text-muted-foreground p-4">
        Transitions view coming soon...
      </div>
    ),
    captions: <Captions />,
    filters: (
      <div className="text-muted-foreground p-4">
        Filters view coming soon...
      </div>
    ),
    adjustment: (
      <div className="text-muted-foreground p-4">
        Adjustment view coming soon...
      </div>
    ),
    settings: <SettingsView />,
  };

  return (
    <div className="bg-panel flex h-full">
      <TabBar />
      <Separator orientation="vertical" />
      <div className="flex-1 overflow-hidden">{viewMap[activeTab]}</div>
    </div>
  );
}
