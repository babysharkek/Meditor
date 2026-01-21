import { ExportFormat } from "@/types/export";

export function getExportMimeType({
  format,
}: {
  format: ExportFormat;
}): string {
  const mimeTypes: Record<ExportFormat, string> = {
    webm: "video/webm",
    mp4: "video/mp4",
  };

  return mimeTypes[format];
}

export function getExportFileExtension({
  format,
}: {
  format: ExportFormat;
}): string {
  return `.${format}`;
}
