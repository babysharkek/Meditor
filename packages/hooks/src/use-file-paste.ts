import { useEffect } from "react";

interface UseFilePasteOptions {
  onFilesPaste: (files: File[]) => void;
}

export function useFilePaste({ onFilesPaste }: UseFilePasteOptions) {
  useEffect(() => {
    function handlePaste(e: ClipboardEvent) {
      if (!e.clipboardData?.files.length) return;

      const files = Array.from(e.clipboardData.files);
      if (files.length > 0) {
        e.preventDefault();
        onFilesPaste(files);
      }
    }

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [onFilesPaste]);
}

