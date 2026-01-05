import { VideoElement, ImageElement } from "@/types/timeline";

export function MediaProperties({
  element,
}: {
  element: VideoElement | ImageElement;
}) {
  return <div className="space-y-4 p-5">Media properties</div>;
}
