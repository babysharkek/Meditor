export function getExportMimeType({
  format,
}: {
  format: "mp4" | "webm";
}): string {
  return format === "webm" ? "video/webm" : "video/mp4";
}

export function getExportFileExtension({
  format,
}: {
  format: "mp4" | "webm";
}): string {
  return `.${format}`;
}
