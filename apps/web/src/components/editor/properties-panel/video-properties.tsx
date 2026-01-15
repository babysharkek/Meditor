import { VideoElement, ImageElement } from "@/types/timeline";

export function VideoProperties({
  element,
}: {
  element: VideoElement | ImageElement;
}) {
  return <div className="space-y-4 p-5">Video properties</div>;
}
