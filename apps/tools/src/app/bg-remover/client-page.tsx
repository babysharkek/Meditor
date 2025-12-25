"use client";
import { Header } from "@/components/header";
import { DownloadIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UploadIcon } from "lucide-react";
import { useFileUpload } from "@opencut/hooks/use-file-upload";
import { useFilePaste } from "@opencut/hooks/use-file-paste";
import { useState, useEffect, useRef } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn, generateUUID } from "@/lib/utils";
import { motion, AnimatePresence } from "motion/react";

interface FileStatus {
  file: File;
  id: string;
  progress: number;
  status: "pending" | "processing" | "completed" | "error";
  batchId: string;
}

export function BGRemoverClient() {
  const [files, setFiles] = useState<FileStatus[]>([]);

  const handleFiles = ({ files: newFiles }: { files: File[] | FileList }) => {
    const newFileStatuses: FileStatus[] = Array.from(newFiles).map((file) => ({
      file,
      id: generateUUID(),
      progress: 0,
      status: "pending",
      batchId: generateUUID(),
    }));
    setFiles((prev) => [...prev, ...newFileStatuses]);
    console.log(newFileStatuses);
  };

  const { isDragOver, openFilePicker, fileInputProps, dragProps } =
    useFileUpload({
      accept: "image/*",
      multiple: false,
      onFilesSelected: (files) => handleFiles({ files }),
    });

  useFilePaste({ onFilesPaste: (files) => handleFiles({ files }) });

  return (
    <div
      className={`flex h-svh flex-col transition-opacity ${isDragOver ? "opacity-50" : ""}`}
      {...dragProps}
    >
      <Header />
      <div className="flex flex-1 flex-col items-center justify-center">
        <AnimatePresence mode="wait">
          {files.length === 0 ? (
            <motion.div
              key="upload"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.1, filter: "blur(10px)" }}
              transition={{ duration: 0.3 }}
              className={`mx-auto flex max-w-md flex-col items-center justify-center gap-7 transition-opacity ${
                isDragOver ? "opacity-50" : ""
              }`}
            >
              <input {...fileInputProps} />
              <div className="relative flex size-28 items-center justify-center">
                <img
                  src="/bg-remover.png"
                  alt="BG Remover"
                  className="absolute size-28 blur-2xl"
                />
                <img
                  src="/bg-remover.png"
                  alt="BG Remover"
                  className="absolute size-28 opacity-0 blur-lg"
                />
                <img
                  src="/bg-remover.png"
                  alt="BG Remover"
                  className="relative z-10 size-24"
                />
              </div>
              <div className="z-10 flex flex-col items-center justify-center gap-5">
                <div className="flex flex-col items-center justify-center gap-4">
                  <h1 className="text-3xl font-semibold">BG Remover</h1>
                  <p className="text-muted-foreground text-center text-lg">
                    Drag and drop, click to browse or paste from clipboard to
                    upload an image.
                  </p>
                </div>
                <Button size="lg" onClick={openFilePicker}>
                  <UploadIcon />
                  Upload image
                </Button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="processing"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{
                type: "spring",
                stiffness: 300,
                damping: 25,
                bounce: 0.3,
                duration: 0.5,
              }}
              className="flex w-full max-w-4xl flex-col items-center justify-center"
            >
              <div className="flex flex-col items-center gap-4">
                <h2 className="text-2xl font-bold">Processing Images...</h2>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
                  {files.map((fileStatus) => (
                    <div
                      key={fileStatus.id}
                      className="border-border bg-card relative overflow-hidden rounded-lg border p-2"
                    >
                      <img
                        src={URL.createObjectURL(fileStatus.file)}
                        alt={fileStatus.file.name}
                        className="aspect-square w-full rounded-md object-cover"
                      />
                      <div className="mt-2 text-center text-sm font-medium">
                        {fileStatus.file.name}
                      </div>
                    </div>
                  ))}
                </div>
                <Button
                  variant="outline"
                  onClick={() => setFiles([])}
                  className="mt-4"
                >
                  Cancel
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
