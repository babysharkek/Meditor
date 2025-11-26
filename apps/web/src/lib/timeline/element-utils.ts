import { TimelineElement } from "@/types/timeline";

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
