"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PanelBaseView as BaseView } from "@/components/editor/panel-base-view";
import {
  PropertyItem,
  PropertyItemLabel,
  PropertyItemValue,
  PropertyGroup,
} from "../../properties-panel/property-item";
import {
  DEFAULT_CANVAS_SIZE,
  FPS_PRESETS,
  BLUR_INTENSITY_PRESETS,
} from "@/constants/editor-constants";
import { useProjectStore } from "@/stores/project-store";
import { useEditorStore } from "@/stores/editor-store";
import { dimensionToAspectRatio } from "@/lib/editor-utils";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { colors } from "@/data/colors/solid";
import { patternCraftGradients } from "@/data/colors/pattern-craft";
import { PipetteIcon, PlusIcon } from "lucide-react";
import { useMemo, memo, useCallback } from "react";
import { syntaxUIGradients } from "@/data/colors/syntax-ui";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export function SettingsView() {
  return <ProjectSettingsTabs />;
}

function ProjectSettingsTabs() {
  return (
    <BaseView
      defaultTab="project-info"
      tabs={[
        {
          value: "project-info",
          label: "Project info",
          content: (
            <div className="p-5">
              <ProjectInfoView />
            </div>
          ),
        },
        {
          value: "background",
          label: "Background",
          content: (
            <div className="flex h-full flex-col justify-between">
              <div className="flex-1 p-5">
                <BackgroundView />
              </div>
              <div className="bg-panel/85 sticky -bottom-0 flex flex-col backdrop-blur-lg">
                <Separator />
                <Button className="text-muted-foreground hover:text-foreground/85 h-auto w-fit !bg-transparent p-5 py-4 text-xs shadow-none">
                  Custom background
                  <PlusIcon />
                </Button>
              </div>

              {/* Another UI, looks so beautiful I don't wanna remove it */}
              {/* <div className="flex flex-col justify-center items-center pb-5 sticky bottom-0">
                <Button className="w-fit h-auto gap-1.5 px-3.5 py-1.5 bg-foreground hover:bg-foreground/85 text-background rounded-full">
                  <span className="text-sm">Custom</span>
                  <PlusIcon className="" />
                </Button>
              </div> */}
            </div>
          ),
        },
      ]}
      className="flex h-full flex-col justify-between p-0"
    />
  );
}

function getCurrentCanvasSize({
  activeProject,
}: {
  activeProject: { canvasSize: { width: number; height: number } } | null;
}) {
  return {
    width: activeProject?.canvasSize.width || DEFAULT_CANVAS_SIZE.width,
    height: activeProject?.canvasSize.height || DEFAULT_CANVAS_SIZE.height,
  };
}

function ProjectInfoView() {
  const { activeProject, updateProjectFps, updateCanvasSize } =
    useProjectStore();
  const { canvasPresets } = useEditorStore();

  const findPresetIndexByAspectRatio = ({
    presets,
    targetAspectRatio,
  }: {
    presets: Array<{ width: number; height: number }>;
    targetAspectRatio: string;
  }) => {
    for (let index = 0; index < presets.length; index++) {
      const preset = presets[index];
      const presetAspectRatio = dimensionToAspectRatio({
        width: preset.width,
        height: preset.height,
      });
      if (presetAspectRatio === targetAspectRatio) {
        return index;
      }
    }
    return -1;
  };

  const currentCanvasSize = getCurrentCanvasSize({ activeProject });
  const currentAspectRatio = dimensionToAspectRatio(currentCanvasSize);
  const presetIndex = findPresetIndexByAspectRatio({
    presets: canvasPresets,
    targetAspectRatio: currentAspectRatio,
  });
  const selectedPresetIndex =
    presetIndex !== -1 ? presetIndex.toString() : undefined;

  const handleAspectRatioChange = ({ value }: { value: string }) => {
    const index = parseInt(value, 10);
    const preset = canvasPresets[index];
    if (preset) {
      updateCanvasSize({
        size: preset,
      });
    }
  };

  const handleFpsChange = (value: string) => {
    const fps = parseFloat(value);
    updateProjectFps(fps);
  };

  return (
    <div className="flex flex-col gap-4">
      <PropertyItem direction="column">
        <PropertyItemLabel>Name</PropertyItemLabel>
        <PropertyItemValue>
          {activeProject?.name || "Untitled project"}
        </PropertyItemValue>
      </PropertyItem>

      <PropertyItem direction="column">
        <PropertyItemLabel>Aspect ratio</PropertyItemLabel>
        <PropertyItemValue>
          <Select
            value={selectedPresetIndex}
            onValueChange={(value) => handleAspectRatioChange({ value })}
          >
            <SelectTrigger className="bg-panel-accent">
              <SelectValue placeholder="Select an aspect ratio" />
            </SelectTrigger>
            <SelectContent>
              {canvasPresets.map((preset, index) => {
                const label = dimensionToAspectRatio({
                  width: preset.width,
                  height: preset.height,
                });
                return (
                  <SelectItem key={label} value={index.toString()}>
                    {label}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </PropertyItemValue>
      </PropertyItem>

      <PropertyItem direction="column">
        <PropertyItemLabel>Frame rate</PropertyItemLabel>
        <PropertyItemValue>
          <Select
            value={(activeProject?.fps || 30).toString()}
            onValueChange={handleFpsChange}
          >
            <SelectTrigger className="bg-panel-accent">
              <SelectValue placeholder="Select a frame rate" />
            </SelectTrigger>
            <SelectContent>
              {FPS_PRESETS.map((preset) => (
                <SelectItem key={preset.value} value={preset.value}>
                  {preset.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </PropertyItemValue>
      </PropertyItem>
    </div>
  );
}

const BlurPreview = memo(
  ({
    blur,
    isSelected,
    onSelect,
  }: {
    blur: { label: string; value: number };
    isSelected: boolean;
    onSelect: () => void;
  }) => (
    <div
      className={cn(
        "border-foreground/15 hover:border-primary relative aspect-square w-full cursor-pointer overflow-hidden rounded-sm border",
        isSelected && "border-primary border-2",
      )}
      onClick={onSelect}
    >
      <Image
        src="https://images.unsplash.com/photo-1501785888041-af3ef285b470?q=80&w=1470&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
        alt={`Blur preview ${blur.label}`}
        fill
        className="object-cover"
        style={{ filter: `blur(${blur.value}px)` }}
        loading="eager"
      />
      <div className="absolute bottom-1 left-1 right-1 text-center">
        <span className="rounded bg-black/50 px-1 text-xs text-white">
          {blur.label}
        </span>
      </div>
    </div>
  ),
);

BlurPreview.displayName = "BlurPreview";

const BackgroundPreviews = memo(
  ({
    backgrounds,
    currentBackgroundColor,
    isColorBackground,
    handleColorSelect,
    useBackgroundColor = false,
  }: {
    backgrounds: string[];
    currentBackgroundColor: string;
    isColorBackground: boolean;
    handleColorSelect: (bg: string) => void;
    useBackgroundColor?: boolean;
  }) => {
    return useMemo(
      () =>
        backgrounds.map((bg, index) => (
          <div
            key={`${index}-${bg}`}
            className={cn(
              "border-foreground/15 hover:border-primary aspect-square w-full cursor-pointer rounded-sm border",
              isColorBackground &&
                bg === currentBackgroundColor &&
                "border-primary border-2",
            )}
            style={
              useBackgroundColor
                ? { backgroundColor: bg }
                : {
                    background: bg,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    backgroundRepeat: "no-repeat",
                  }
            }
            onClick={() => handleColorSelect(bg)}
          />
        )),
      [
        backgrounds,
        isColorBackground,
        currentBackgroundColor,
        handleColorSelect,
        useBackgroundColor,
      ],
    );
  },
);

BackgroundPreviews.displayName = "BackgroundPreviews";

function BackgroundView() {
  const { activeProject, updateBackgroundType } = useProjectStore();

  const blurLevels = useMemo(() => BLUR_INTENSITY_PRESETS, []);

  const handleBlurSelect = useCallback(
    async ({ blurIntensity }: { blurIntensity: number }) => {
      await updateBackgroundType("blur", { blurIntensity });
    },
    [updateBackgroundType],
  );

  const handleColorSelect = useCallback(
    async (color: string) => {
      await updateBackgroundType("color", { backgroundColor: color });
    },
    [updateBackgroundType],
  );

  const currentBlurIntensity = activeProject?.blurIntensity || 8;
  const isBlurBackground = activeProject?.backgroundType === "blur";
  const currentBackgroundColor = activeProject?.backgroundColor || "#000000";
  const isColorBackground = activeProject?.backgroundType === "color";

  const blurPreviews = useMemo(
    () =>
      blurLevels.map((blur) => (
        <BlurPreview
          key={blur.value}
          blur={blur}
          isSelected={isBlurBackground && currentBlurIntensity === blur.value}
          onSelect={() => handleBlurSelect({ blurIntensity: blur.value })}
        />
      )),
    [blurLevels, isBlurBackground, currentBlurIntensity, handleBlurSelect],
  );

  return (
    <div className="flex h-full flex-col gap-4">
      <PropertyGroup title="Blur" defaultExpanded={false}>
        <div className="grid w-full grid-cols-4 gap-2">{blurPreviews}</div>
      </PropertyGroup>

      <PropertyGroup title="Colors" defaultExpanded={false}>
        <div className="grid w-full grid-cols-4 gap-2">
          <div className="border-foreground/15 hover:border-primary flex aspect-square w-full cursor-pointer items-center justify-center rounded-sm border">
            <PipetteIcon className="size-4" />
          </div>
          <BackgroundPreviews
            backgrounds={colors}
            currentBackgroundColor={currentBackgroundColor}
            isColorBackground={isColorBackground}
            handleColorSelect={handleColorSelect}
            useBackgroundColor={true}
          />
        </div>
      </PropertyGroup>

      <PropertyGroup title="Pattern craft" defaultExpanded={false}>
        <div className="grid w-full grid-cols-4 gap-2">
          <BackgroundPreviews
            backgrounds={patternCraftGradients}
            currentBackgroundColor={currentBackgroundColor}
            isColorBackground={isColorBackground}
            handleColorSelect={handleColorSelect}
          />
        </div>
      </PropertyGroup>

      <PropertyGroup title="Syntax UI" defaultExpanded={false}>
        <div className="grid w-full grid-cols-4 gap-2">
          <BackgroundPreviews
            backgrounds={syntaxUIGradients}
            currentBackgroundColor={currentBackgroundColor}
            isColorBackground={isColorBackground}
            handleColorSelect={handleColorSelect}
          />
        </div>
      </PropertyGroup>
    </div>
  );
}
