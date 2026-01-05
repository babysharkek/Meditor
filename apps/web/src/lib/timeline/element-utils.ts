import { DEFAULT_TEXT_ELEMENT } from "@/constants/text-constants";
import { TIMELINE_CONSTANTS } from "@/constants/timeline-constants";
import {
  CreateTimelineElement,
  TextElement,
  TimelineElement,
  AudioElement,
  VideoElement,
  ImageElement,
} from "@/types/timeline";
import type { AssetDragData } from "@/types/assets";

export function isMutableElement(
  element: TimelineElement,
): element is AudioElement | VideoElement {
  return element.type === "audio" || element.type === "video";
}

export function canBeHidden(
  element: TimelineElement,
): element is VideoElement | ImageElement | TextElement {
  return element.type !== "audio";
}

export function checkElementOverlaps({
  elements,
}: {
  elements: TimelineElement[];
}): boolean {
  const sortedElements = [...elements].sort(
    (a, b) => a.startTime - b.startTime,
  );

  for (let i = 0; i < sortedElements.length - 1; i++) {
    const current = sortedElements[i];
    const next = sortedElements[i + 1];

    const currentEnd =
      current.startTime +
      (current.duration - current.trimStart - current.trimEnd);

    if (currentEnd > next.startTime) return true;
  }

  return false;
}

export function resolveElementOverlaps({
  elements,
}: {
  elements: TimelineElement[];
}): TimelineElement[] {
  const sortedElements = [...elements].sort(
    (a, b) => a.startTime - b.startTime,
  );
  const resolvedElements: TimelineElement[] = [];

  for (let i = 0; i < sortedElements.length; i++) {
    const current = { ...sortedElements[i] };

    if (resolvedElements.length > 0) {
      const previous = resolvedElements[resolvedElements.length - 1];
      const previousEnd =
        previous.startTime +
        (previous.duration - previous.trimStart - previous.trimEnd);

      if (current.startTime < previousEnd) {
        current.startTime = previousEnd;
      }
    }

    resolvedElements.push(current);
  }

  return resolvedElements;
}

export function wouldElementOverlap({
  elements,
  startTime,
  endTime,
  excludeElementId,
}: {
  elements: TimelineElement[];
  startTime: number;
  endTime: number;
  excludeElementId?: string;
}): boolean {
  return elements.some((el) => {
    if (excludeElementId && el.id === excludeElementId) return false;
    const elEnd = el.startTime + el.duration - el.trimStart - el.trimEnd;
    return startTime < elEnd && endTime > el.startTime;
  });
}

export function buildTextElement({
  raw,
  startTime,
}: {
  raw: TextElement | AssetDragData;
  startTime: number;
}): CreateTimelineElement {
  const t = raw as Partial<TextElement>;

  return {
    type: "text",
    name: t.name ?? DEFAULT_TEXT_ELEMENT.name,
    content: t.content ?? DEFAULT_TEXT_ELEMENT.content,
    duration: t.duration ?? TIMELINE_CONSTANTS.DEFAULT_ELEMENT_DURATION,
    startTime,
    trimStart: 0,
    trimEnd: 0,
    fontSize:
      typeof t.fontSize === "number"
        ? t.fontSize
        : DEFAULT_TEXT_ELEMENT.fontSize,
    fontFamily: t.fontFamily ?? DEFAULT_TEXT_ELEMENT.fontFamily,
    color: t.color ?? DEFAULT_TEXT_ELEMENT.color,
    backgroundColor: t.backgroundColor ?? DEFAULT_TEXT_ELEMENT.backgroundColor,
    textAlign: t.textAlign ?? DEFAULT_TEXT_ELEMENT.textAlign,
    fontWeight: t.fontWeight ?? DEFAULT_TEXT_ELEMENT.fontWeight,
    fontStyle: t.fontStyle ?? DEFAULT_TEXT_ELEMENT.fontStyle,
    textDecoration: t.textDecoration ?? DEFAULT_TEXT_ELEMENT.textDecoration,
  };
}
