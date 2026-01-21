import { Button } from "@/components/ui/button";
import { PropertyGroup } from "../../properties-panel/property-item";
import { PanelBaseView as BaseView } from "@/components/editor/panel-base-view";
import { LanguageSelect } from "@/components/language-select";
import { useState, useRef } from "react";
import { extractTimelineAudio } from "@/lib/media/mediabunny";
import { useEditor } from "@/hooks/use-editor";
import { DEFAULT_TEXT_ELEMENT } from "@/constants/text-constants";
import { LANGUAGES } from "@/constants/captions-constants";
import { Loader2 } from "lucide-react";
import type { TranscriptionProgress } from "@/types/transcription";
import { transcriptionService } from "@/services/transcription";
import { decodeAudioToFloat32 } from "@/lib/media/audio";
import { buildCaptionChunks } from "@/lib/utils/caption-utils";

export function Captions() {
  const [selectedLanguage, setSelectedLanguage] = useState("auto");
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState("");
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const editor = useEditor();

  const handleProgress = (progress: TranscriptionProgress) => {
    if (progress.status === "loading-model") {
      setProcessingStep(`Loading model ${Math.round(progress.progress)}%`);
    } else if (progress.status === "transcribing") {
      setProcessingStep("Transcribing...");
    }
  };

  const handleGenerateTranscript = async () => {
    try {
      setIsProcessing(true);
      setError(null);
      setProcessingStep("Extracting audio...");

      const audioBlob = await extractTimelineAudio({
        tracks: editor.timeline.getTracks(),
        mediaAssets: editor.media.getAssets(),
        totalDuration: editor.timeline.getTotalDuration(),
      });

      setProcessingStep("Preparing audio...");
      const { samples } = await decodeAudioToFloat32({ audioBlob });

      const result = await transcriptionService.transcribe({
        audioData: samples,
        language:
          selectedLanguage === "auto" ? "auto" : selectedLanguage.toLowerCase(),
        onProgress: handleProgress,
      });

      setProcessingStep("Generating captions...");
      const captionChunks = buildCaptionChunks({ segments: result.segments });

      const captionTrackId = editor.timeline.addTrack({
        type: "text",
        index: 0,
      });

      for (let i = 0; i < captionChunks.length; i++) {
        const caption = captionChunks[i];
        editor.timeline.insertElement({
          placement: { mode: "explicit", trackId: captionTrackId },
          element: {
            ...DEFAULT_TEXT_ELEMENT,
            name: `Caption ${i + 1}`,
            content: caption.text,
            duration: caption.duration,
            startTime: caption.startTime,
            fontSize: 65,
            fontWeight: "bold",
          },
        });
      }
    } catch (error) {
      console.error("Transcription failed:", error);
      setError(
        error instanceof Error ? error.message : "An unexpected error occurred",
      );
    } finally {
      setIsProcessing(false);
      setProcessingStep("");
    }
  };

  return (
    <BaseView
      ref={containerRef}
      className="flex h-full flex-col justify-between"
    >
      <PropertyGroup title="Language">
        <LanguageSelect
          selectedCountry={selectedLanguage}
          onSelect={setSelectedLanguage}
          containerRef={containerRef}
          languages={LANGUAGES}
        />
      </PropertyGroup>

      <div className="flex flex-col gap-4">
        {error && (
          <div className="bg-destructive/10 border-destructive/20 rounded-md border p-3">
            <p className="text-destructive text-sm">{error}</p>
          </div>
        )}

        <Button
          className="w-full"
          onClick={handleGenerateTranscript}
          disabled={isProcessing}
        >
          {isProcessing && <Loader2 className="mr-1 animate-spin" />}
          {isProcessing ? processingStep : "Generate transcript"}
        </Button>
      </div>
    </BaseView>
  );
}
