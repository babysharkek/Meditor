import type {
  AudioElement,
  LibraryAudioElement,
  TimelineElement,
  TimelineTrack,
} from "@/types/timeline";
import type { MediaAsset } from "@/types/assets";
import { canElementHaveAudio } from "@/lib/timeline/element-utils";
import { canTracktHaveAudio } from "@/lib/timeline";
import { mediaSupportsAudio } from "@/lib/media-utils";

export type CollectedAudioElement = Omit<
  AudioElement,
  "type" | "mediaId" | "volume" | "id" | "name" | "sourceType" | "sourceUrl"
> & { buffer: AudioBuffer };

export function createAudioContext(): AudioContext {
  const AudioContextConstructor =
    window.AudioContext ||
    (window as typeof window & { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;

  return new AudioContextConstructor();
}

export async function collectAudioElements({
  tracks,
  mediaAssets,
  audioContext,
}: {
  tracks: TimelineTrack[];
  mediaAssets: MediaAsset[];
  audioContext: AudioContext;
}): Promise<CollectedAudioElement[]> {
  const mediaMap = new Map<string, MediaAsset>(
    mediaAssets.map((media) => [media.id, media]),
  );
  const pendingElements: Array<Promise<CollectedAudioElement | null>> = [];

  for (const track of tracks) {
    if (canTracktHaveAudio(track) && track.muted) continue;

    for (const element of track.elements) {
      if (element.type !== "audio") continue;
      if (element.duration <= 0) continue;

      const isTrackMuted = canTracktHaveAudio(track) && track.muted;
      pendingElements.push(
        resolveAudioBufferForElement({
          element,
          mediaMap,
          audioContext,
        }).then((audioBuffer) => {
          if (!audioBuffer) return null;
          return {
            buffer: audioBuffer,
            startTime: element.startTime,
            duration: element.duration,
            trimStart: element.trimStart,
            trimEnd: element.trimEnd,
            muted: element.muted || isTrackMuted,
          };
        }),
      );
    }
  }

  const resolvedElements = await Promise.all(pendingElements);
  const audioElements: CollectedAudioElement[] = [];
  for (const element of resolvedElements) {
    if (element) audioElements.push(element);
  }
  return audioElements;
}

async function resolveAudioBufferForElement({
  element,
  mediaMap,
  audioContext,
}: {
  element: AudioElement;
  mediaMap: Map<string, MediaAsset>;
  audioContext: AudioContext;
}): Promise<AudioBuffer | null> {
  try {
    if (element.sourceType === "upload") {
      const asset = mediaMap.get(element.mediaId);
      if (!asset || asset.type !== "audio") return null;

      const arrayBuffer = await asset.file.arrayBuffer();
      return await audioContext.decodeAudioData(arrayBuffer.slice(0));
    }

    if (element.buffer) return element.buffer;

    const response = await fetch(element.sourceUrl);
    if (!response.ok) {
      throw new Error(`Library audio fetch failed: ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return await audioContext.decodeAudioData(arrayBuffer.slice(0));
  } catch (error) {
    console.warn("Failed to decode audio:", error);
    return null;
  }
}

interface AudioMixSource {
  file: File;
  startTime: number;
  duration: number;
  trimStart: number;
  trimEnd: number;
}

async function fetchLibraryAudioSource({
  element,
}: {
  element: LibraryAudioElement;
}): Promise<AudioMixSource | null> {
  try {
    const response = await fetch(element.sourceUrl);
    if (!response.ok) {
      throw new Error(`Library audio fetch failed: ${response.status}`);
    }

    const blob = await response.blob();
    const file = new File([blob], `${element.name}.mp3`, {
      type: "audio/mpeg",
    });

    return {
      file,
      startTime: element.startTime,
      duration: element.duration,
      trimStart: element.trimStart,
      trimEnd: element.trimEnd,
    };
  } catch (error) {
    console.warn("Failed to fetch library audio:", error);
    return null;
  }
}

function collectMediaAudioSource({
  element,
  mediaAsset,
}: {
  element: TimelineElement;
  mediaAsset: MediaAsset;
}): AudioMixSource {
  return {
    file: mediaAsset.file,
    startTime: element.startTime,
    duration: element.duration,
    trimStart: element.trimStart,
    trimEnd: element.trimEnd,
  };
}

export async function collectAudioMixSources({
  tracks,
  mediaAssets,
}: {
  tracks: TimelineTrack[];
  mediaAssets: MediaAsset[];
}): Promise<AudioMixSource[]> {
  const audioMixSources: AudioMixSource[] = [];
  const mediaMap = new Map<string, MediaAsset>(
    mediaAssets.map((asset) => [asset.id, asset]),
  );
  const pendingLibrarySources: Array<Promise<AudioMixSource | null>> = [];

  for (const track of tracks) {
    if (canTracktHaveAudio(track) && track.muted) continue;

    for (const element of track.elements) {
      if (!canElementHaveAudio(element)) continue;

      if (element.type === "audio") {
        if (element.sourceType === "upload") {
          const mediaAsset = mediaMap.get(element.mediaId);
          if (!mediaAsset) continue;

          audioMixSources.push(
            collectMediaAudioSource({ element, mediaAsset }),
          );
        } else {
          pendingLibrarySources.push(fetchLibraryAudioSource({ element }));
        }
        continue;
      }

      if (element.type === "video") {
        const mediaAsset = mediaMap.get(element.mediaId);
        if (!mediaAsset) continue;

        if (mediaSupportsAudio({ media: mediaAsset })) {
          audioMixSources.push(
            collectMediaAudioSource({ element, mediaAsset }),
          );
        }
      }
    }
  }

  const resolvedLibrarySources = await Promise.all(pendingLibrarySources);
  for (const source of resolvedLibrarySources) {
    if (source) audioMixSources.push(source);
  }

  return audioMixSources;
}

export async function createTimelineAudioBuffer({
  tracks,
  mediaAssets,
  duration,
  sampleRate = 44100,
}: {
  tracks: TimelineTrack[];
  mediaAssets: MediaAsset[];
  duration: number;
  sampleRate?: number;
}): Promise<AudioBuffer | null> {
  const audioContext = createAudioContext();

  const audioElements = await collectAudioElements({
    tracks,
    mediaAssets,
    audioContext,
  });

  if (audioElements.length === 0) return null;

  const outputChannels = 2;
  const outputLength = Math.ceil(duration * sampleRate);
  const outputBuffer = audioContext.createBuffer(
    outputChannels,
    outputLength,
    sampleRate,
  );

  for (const element of audioElements) {
    if (element.muted) continue;

    mixAudioChannels({
      element,
      outputBuffer,
      outputLength,
      sampleRate,
    });
  }

  return outputBuffer;
}

function mixAudioChannels({
  element,
  outputBuffer,
  outputLength,
  sampleRate,
}: {
  element: CollectedAudioElement;
  outputBuffer: AudioBuffer;
  outputLength: number;
  sampleRate: number;
}): void {
  const { buffer, startTime, trimStart, duration: elementDuration } = element;

  const sourceStartSample = Math.floor(trimStart * buffer.sampleRate);
  const sourceLengthSamples = Math.floor(elementDuration * buffer.sampleRate);
  const outputStartSample = Math.floor(startTime * sampleRate);

  const resampleRatio = sampleRate / buffer.sampleRate;
  const resampledLength = Math.floor(sourceLengthSamples * resampleRatio);

  const outputChannels = 2;
  for (let channel = 0; channel < outputChannels; channel++) {
    const outputData = outputBuffer.getChannelData(channel);
    const sourceChannel = Math.min(channel, buffer.numberOfChannels - 1);
    const sourceData = buffer.getChannelData(sourceChannel);

    for (let i = 0; i < resampledLength; i++) {
      const outputIndex = outputStartSample + i;
      if (outputIndex >= outputLength) break;

      const sourceIndex = sourceStartSample + Math.floor(i / resampleRatio);
      if (sourceIndex >= sourceData.length) break;

      outputData[outputIndex] += sourceData[sourceIndex];
    }
  }
}
