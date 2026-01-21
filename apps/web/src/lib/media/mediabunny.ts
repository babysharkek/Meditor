import { FFmpeg } from "@ffmpeg/ffmpeg";
import { Input, ALL_FORMATS, BlobSource } from "mediabunny";
import { collectAudioMixSources } from "@/lib/media/audio";
import type { TimelineTrack } from "@/types/timeline";
import type { MediaAsset } from "@/types/assets";

let ffmpeg: FFmpeg | null = null;

export const initFFmpeg = async (): Promise<FFmpeg> => {
  if (ffmpeg) return ffmpeg;

  ffmpeg = new FFmpeg();
  await ffmpeg.load(); // Use default config

  return ffmpeg;
};

export async function getVideoInfo({
  videoFile,
}: {
  videoFile: File;
}): Promise<{
  duration: number;
  width: number;
  height: number;
  fps: number;
}> {
  const input = new Input({
    source: new BlobSource(videoFile),
    formats: ALL_FORMATS,
  });

  const duration = await input.computeDuration();
  const videoTrack = await input.getPrimaryVideoTrack();

  if (!videoTrack) {
    throw new Error("No video track found in the file");
  }

  // Get frame rate from packet statistics
  const packetStats = await videoTrack.computePacketStats(100);
  const fps = packetStats.averagePacketRate;

  return {
    duration,
    width: videoTrack.displayWidth,
    height: videoTrack.displayHeight,
    fps,
  };
}

// audio mixing for timeline - keeping ffmpeg for now due to complexity
// TODO: Replace with Mediabunny audio processing when implementing canvas preview
export const extractTimelineAudio = async ({
  tracks,
  mediaAssets,
  totalDuration,
  onProgress,
}: {
  tracks: TimelineTrack[];
  mediaAssets: MediaAsset[];
  totalDuration: number;
  onProgress?: (progress: number) => void;
}): Promise<Blob> => {
  const ffmpeg = new FFmpeg();

  try {
    await ffmpeg.load();
  } catch (error) {
    console.error("Failed to load fresh FFmpeg instance:", error);
    throw new Error("Unable to initialize audio processing. Please try again.");
  }

  if (totalDuration === 0) {
    const emptyAudioData = new ArrayBuffer(44);
    return new Blob([emptyAudioData], { type: "audio/wav" });
  }

  if (onProgress) {
    ffmpeg.on("progress", ({ progress }) => {
      onProgress(progress * 100);
    });
  }

  const audioMixSources = await collectAudioMixSources({
    tracks,
    mediaAssets,
  });

  if (audioMixSources.length === 0) {
    // Return silent audio if no audio elements
    const silentDuration = Math.max(1, totalDuration); // At least 1 second
    try {
      const silentAudio = await generateSilentAudio(silentDuration);
      return silentAudio;
    } catch (error) {
      console.error("Failed to generate silent audio:", error);
      throw new Error("Unable to generate audio for empty timeline.");
    }
  }

  // Create a complex filter to mix all audio sources
  const inputFiles: string[] = [];
  const filterInputs: string[] = [];

  try {
    for (let i = 0; i < audioMixSources.length; i++) {
      const element = audioMixSources[i];
      const inputName = `input_${i}.${element.file.name.split(".").pop()}`;
      inputFiles.push(inputName);

      try {
        await ffmpeg.writeFile(
          inputName,
          new Uint8Array(await element.file.arrayBuffer()),
        );
      } catch (error) {
        console.error(`Failed to write file ${element.file.name}:`, error);
        throw new Error(
          `Unable to process file: ${element.file.name}. The file may be corrupted or in an unsupported format.`,
        );
      }

      const actualStart = element.trimStart;
      const actualDuration = element.duration;

      const filterName = `audio_${i}`;
      filterInputs.push(
        `[${i}:a]atrim=start=${actualStart}:duration=${actualDuration},asetpts=PTS-STARTPTS,adelay=${element.startTime * 1000}|${element.startTime * 1000}[${filterName}]`,
      );
    }

    const mixFilter =
      audioMixSources.length === 1
        ? `[audio_0]aresample=44100,aformat=sample_fmts=s16:channel_layouts=stereo[out]`
        : `${filterInputs.map((_, i) => `[audio_${i}]`).join("")}amix=inputs=${audioMixSources.length}:duration=longest:dropout_transition=2,aresample=44100,aformat=sample_fmts=s16:channel_layouts=stereo[out]`;

    const complexFilter = [...filterInputs, mixFilter].join(";");
    const outputName = "timeline_audio.wav";

    const ffmpegArgs = [
      ...inputFiles.flatMap((name) => ["-i", name]),
      "-filter_complex",
      complexFilter,
      "-map",
      "[out]",
      "-t",
      totalDuration.toString(),
      "-c:a",
      "pcm_s16le",
      "-ar",
      "44100",
      outputName,
    ];

    try {
      await ffmpeg.exec(ffmpegArgs);
    } catch (error) {
      console.error("FFmpeg execution failed:", error);
      throw new Error(
        "Audio processing failed. Some audio files may be corrupted or incompatible.",
      );
    }

    const data = await ffmpeg.readFile(outputName);
    const blob = new Blob([data], { type: "audio/wav" });

    return blob;
  } catch (error) {
    for (const inputFile of inputFiles) {
      try {
        await ffmpeg.deleteFile(inputFile);
      } catch (cleanupError) {
        console.warn(`Failed to cleanup file ${inputFile}:`, cleanupError);
      }
    }
    try {
      await ffmpeg.deleteFile("timeline_audio.wav");
    } catch (cleanupError) {
      console.warn("Failed to cleanup output file:", cleanupError);
    }

    throw error;
  } finally {
    for (const inputFile of inputFiles) {
      try {
        await ffmpeg.deleteFile(inputFile);
      } catch (cleanupError) {}
    }
    try {
      await ffmpeg.deleteFile("timeline_audio.wav");
    } catch (cleanupError) {}
  }
};

const generateSilentAudio = async (durationSeconds: number): Promise<Blob> => {
  const ffmpeg = await initFFmpeg();
  const outputName = "silent.wav";

  try {
    await ffmpeg.exec([
      "-f",
      "lavfi",
      "-i",
      `anullsrc=channel_layout=stereo:sample_rate=44100`,
      "-t",
      durationSeconds.toString(),
      "-c:a",
      "pcm_s16le",
      outputName,
    ]);

    const data = await ffmpeg.readFile(outputName);
    const blob = new Blob([data], { type: "audio/wav" });

    return blob;
  } catch (error) {
    console.error("Failed to generate silent audio:", error);
    throw error;
  } finally {
    try {
      await ffmpeg.deleteFile(outputName);
    } catch (cleanupError) {
      // Silent cleanup
    }
  }
};
