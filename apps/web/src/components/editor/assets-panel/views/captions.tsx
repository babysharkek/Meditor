import { Button } from "@/components/ui/button";
import { PropertyGroup } from "../../properties-panel/property-item";
import { PanelBaseView as BaseView } from "@/components/editor/panel-base-view";
import { LanguageSelect } from "@/components/language-select";
import { useState, useRef, useEffect } from "react";
import { extractTimelineAudio } from "@/lib/media/mediabunny";
import { useEditor } from "@/hooks/use-editor";
import { DEFAULT_TEXT_ELEMENT } from "@/constants/text-constants";
import { LANGUAGES } from "@/constants/captions-constants";
import { Loader2, Shield, Trash2, Upload } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TextElement } from "@/types/timeline";

interface TranscriptionSegment {
  text: string;
  start: number;
  end: number;
}

const PRIVACY_DIALOG_KEY = "opencut-transcription-privacy-accepted";

export function Captions() {
  const [selectedCountry, setSelectedCountry] = useState("auto");
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [showPrivacyDialog, setShowPrivacyDialog] = useState(false);
  const [hasAcceptedPrivacy, setHasAcceptedPrivacy] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const editor = useEditor();

  useEffect(() => {
    const hasAccepted = localStorage.getItem(PRIVACY_DIALOG_KEY) === "true";
    setHasAcceptedPrivacy(hasAccepted);
  }, []);

  const handleGenerateTranscript = async () => {
    try {
      setIsProcessing(true);
      setError(null);
      setProcessingStep("Extracting audio...");

      const audioBlob = await extractTimelineAudio();

      setProcessingStep("Encrypting audio...");
      const audioBuffer = await audioBlob.arrayBuffer();
      const encryptionResult = await encryptWithRandomKey(audioBuffer);
      const encryptedBlob = new Blob([encryptionResult.encryptedData]);

      setProcessingStep("Uploading...");
      const uploadResponse = await fetch("/api/get-upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileExtension: "wav" }),
      });

      if (!uploadResponse.ok) {
        const error = await uploadResponse.json();
        throw new Error(error.message || "Failed to get upload URL");
      }

      const { uploadUrl, fileName } = await uploadResponse.json();

      await fetch(uploadUrl, {
        method: "PUT",
        body: encryptedBlob,
      });

      setProcessingStep("Transcribing...");

      const transcriptionResponse = await fetch("/api/transcribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: fileName,
          language:
            selectedCountry === "auto" ? "auto" : selectedCountry.toLowerCase(),
          decryptionKey: arrayBufferToBase64(encryptionResult.key),
          iv: arrayBufferToBase64(encryptionResult.iv),
        }),
      });

      if (!transcriptionResponse.ok) {
        const error = await transcriptionResponse.json();
        throw new Error(error.message || "Transcription failed");
      }

      const { text, segments } = await transcriptionResponse.json();

      const shortCaptions: Array<{
        text: string;
        startTime: number;
        duration: number;
      }> = [];

      let globalEndTime = 0;

      segments.forEach((segment: TranscriptionSegment) => {
        const words = segment.text.trim().split(/\s+/);
        const segmentDuration = segment.end - segment.start;
        const wordsPerSecond = words.length / segmentDuration;

        const chunks: string[] = [];
        for (let i = 0; i < words.length; i += 3) {
          chunks.push(words.slice(i, i + 3).join(" "));
        }

        let chunkStartTime = segment.start;
        chunks.forEach((chunk) => {
          const chunkWords = chunk.split(/\s+/).length;
          const chunkDuration = Math.max(0.8, chunkWords / wordsPerSecond);
          const adjustedStartTime = Math.max(chunkStartTime, globalEndTime);

          shortCaptions.push({
            text: chunk,
            startTime: adjustedStartTime,
            duration: chunkDuration,
          });

          globalEndTime = adjustedStartTime + chunkDuration;
          chunkStartTime += chunkDuration;
        });
      });

      const captionTrackId = editor.timeline.addTrack({
        type: "text",
        index: 0,
      });

      shortCaptions.forEach((caption, index) => {
        editor.timeline.insertElement({
          placement: { mode: "explicit", trackId: captionTrackId },
          element: {
            ...DEFAULT_TEXT_ELEMENT,
            name: `Caption ${index + 1}`,
            content: caption.text,
            duration: caption.duration,
            startTime: caption.startTime,
            fontSize: 65,
            fontWeight: "bold",
          } as TextElement,
        });
      });
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
          selectedCountry={selectedCountry}
          onSelect={setSelectedCountry}
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
          onClick={() => {
            if (hasAcceptedPrivacy) {
              handleGenerateTranscript();
            } else {
              setShowPrivacyDialog(true);
            }
          }}
          disabled={isProcessing}
        >
          {isProcessing && <Loader2 className="mr-1 animate-spin" />}
          {isProcessing ? processingStep : "Generate transcript"}
        </Button>

        <Dialog open={showPrivacyDialog} onOpenChange={setShowPrivacyDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Shield className="size-5" />
                Audio processing notice
              </DialogTitle>
              <DialogDescription className="space-y-3">
                <p>
                  To generate captions, we need to process your timeline audio
                  using speech-to-text technology.
                </p>

                <div className="space-y-2 pt-2">
                  <div className="flex items-start gap-2">
                    <Shield className="size-4 flex-shrink-0" />
                    <span className="text-sm">
                      Zero-knowledge encryption - we cannot decrypt your files
                      even if we wanted to
                    </span>
                  </div>

                  <div className="flex items-start gap-2">
                    <Shield className="size-4 flex-shrink-0" />
                    <span className="text-sm">
                      Encryption keys generated randomly in your browser, never
                      stored anywhere
                    </span>
                  </div>

                  <div className="flex items-start gap-2">
                    <Upload className="size-4 flex-shrink-0" />
                    <span className="text-sm">
                      Audio encrypted before upload - raw audio never leaves
                      your device
                    </span>
                  </div>

                  <div className="flex items-start gap-2">
                    <Trash2 className="size-4 flex-shrink-0" />
                    <span className="text-sm">
                      Everything permanently deleted within seconds after
                      transcription
                    </span>
                  </div>
                </div>

                <p className="text-muted-foreground text-xs">
                  <strong>True zero-knowledge privacy:</strong> Encryption keys
                  are generated randomly in your browser and never stored
                  anywhere. It's cryptographically impossible for us, our cloud
                  providers, or anyone else to decrypt your audio files.
                </p>
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => setShowPrivacyDialog(false)}
                disabled={isProcessing}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  localStorage.setItem(PRIVACY_DIALOG_KEY, "true");
                  setHasAcceptedPrivacy(true);
                  setShowPrivacyDialog(false);
                  handleGenerateTranscript();
                }}
                disabled={isProcessing}
              >
                Continue & generate captions
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </BaseView>
  );
}
