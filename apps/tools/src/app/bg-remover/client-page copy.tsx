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

interface FileStatus {
  file: File;
  id: string;
  progress: number;
  status: "pending" | "processing" | "completed" | "error";
  batchId: string;
}

export function BGRemoverClient() {
  const [files, setFiles] = useState<FileStatus[]>([]);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [isFinishedUploading, setIsFinishedUploading] = useState(false);

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
    // setIsFinishedUploading(false);
    // setIsPopoverOpen(true);
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setFiles((prev) => {
        if (
          !prev.some((f) => f.status === "pending" || f.status === "processing")
        ) {
          return prev;
        }
        return prev.map((f) => {
          if (f.status === "completed") return f;

          if (f.status === "pending") {
            return { ...f, status: "processing", progress: 0 };
          }

          if (f.status === "processing") {
            const newProgress = Math.min(
              f.progress + Math.random() * 15 + 5,
              100,
            );
            return {
              ...f,
              progress: newProgress,
              status: newProgress >= 100 ? "completed" : "processing",
            };
          }
          return f;
        });
      });
    }, 500);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (files.length > 0 && files.every((f) => f.status === "completed")) {
      setIsFinishedUploading(true);
    }
  }, [files]);

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
      <Header
        rightContent={
          <div className="flex items-center gap-3">
            <Button variant="outline" className="h-10 px-5 text-[0.9rem] hover:bg-transparent">Auto</Button>
            <FilesPopover
              files={files}
              isPopoverOpen={isPopoverOpen}
              setIsPopoverOpen={setIsPopoverOpen}
              isFinishedUploading={isFinishedUploading}
            />
          </div>
        }
      />
      <div
        className={`mx-auto flex max-w-md flex-1 flex-col items-center justify-center gap-7 transition-opacity ${
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
              Drag and drop, click to browse or paste from clipboard to upload
              an image.
            </p>
          </div>
          <Button size="lg" onClick={openFilePicker}>
            <UploadIcon />
            Upload image
          </Button>
        </div>
      </div>
    </div>
  );
}

const FilesPopover = ({
  files,
  isPopoverOpen,
  setIsPopoverOpen,
  isFinishedUploading,
}: {
  files: FileStatus[];
  isPopoverOpen: boolean;
  setIsPopoverOpen: (open: boolean) => void;
  isFinishedUploading: boolean;
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const prevFileLengthRef = useRef(0);

  useEffect(() => {
    if (files.length > prevFileLengthRef.current) {
      const scrollToBottom = () => {
        scrollContainerRef.current?.scrollTo({
          top: scrollContainerRef.current.scrollHeight,
          behavior: "smooth",
        });
      };

      if (scrollContainerRef.current) {
        scrollToBottom();
      } else {
        // popover just opened, wait for open animation to finish
        setTimeout(scrollToBottom, 100);
      }
    }
    prevFileLengthRef.current = files.length;
  }, [files.length]);

  const isProcessing = files.some(
    (f) => f.status === "processing" || f.status === "pending",
  );

  const inProgressFiles = files.filter(
    (f) => f.status === "processing" || f.status === "pending",
  );
  const overallProgress =
    inProgressFiles.length > 0
      ? inProgressFiles.reduce((acc, f) => acc + f.progress, 0) /
        inProgressFiles.length
      : 0;

  const hasCompletedFiles = files.some((f) => f.status === "completed");
  const canDownloadAll = hasCompletedFiles;

  return (
    <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
      <PopoverTrigger>
        <Button
          size="icon"
          variant="outline"
          className={cn(
            "relative size-10 rounded-full transition-all duration-100 active:scale-[0.92]",
            isFinishedUploading &&
              "bg-primary hover:bg-primary/90 border-transparent",
          )}
        >
          {isProcessing && <ProgressIndicator progress={overallProgress} />}
          <DownloadIcon
            className={cn(isFinishedUploading && "text-primary-foreground")}
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="max-h-[23rem] w-[23rem] overflow-y-auto py-0"
        ref={scrollContainerRef}
        onInteractOutside={(e) => {
          const target = e.target as HTMLElement;
          const isInteractive =
            target.closest("button") ||
            target.closest("a") ||
            target.closest("p") ||
            target.closest("h1") ||
            target.closest("h2") ||
            target.closest("h3") ||
            target.closest("h4") ||
            target.closest("h5") ||
            target.closest("h6") ||
            target.closest("input") ||
            target.closest("[role='button']") ||
            target.tagName === "IMG" ||
            target.tagName === "VIDEO";

          if (isInteractive) {
            e.preventDefault();
          }
        }}
      >
        <div className="flex flex-col gap-0">
          <div className="bg-background sticky top-0 flex items-center justify-between pb-3 pt-4">
            <h3 className="text-base font-semibold">Downloads</h3>
          </div>
          <div className="flex flex-col">
            {files.length === 0 && (
              <div className="text-muted-foreground pb-2 pt-4 text-center text-sm">
                No files uploaded yet
              </div>
            )}
            <div className="flex flex-col gap-2.5">
              {files.map((fileStatus) => (
                <FileItem key={fileStatus.id} fileStatus={fileStatus} />
              ))}
            </div>

            <div className="bg-background sticky bottom-0 flex flex-col gap-1 pb-3 pt-3.5">
              {files.length > 0 && (
                <Button
                  disabled={!canDownloadAll}
                  className={cn("w-full", files.length <= 1 && "hidden")}
                  variant="outline"
                >
                  Download all (
                  {files.filter((f) => f.status === "completed").length})
                </Button>
              )}
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

const ProgressIndicator = ({ progress }: { progress: number }) => (
  <svg
    className="absolute -inset-[1px] -rotate-90"
    style={{ width: "calc(100% + 2px)", height: "calc(100% + 2px)" }}
    viewBox="0 0 42 42"
  >
    <circle
      cx="21"
      cy="21"
      r="20.5"
      fill="none"
      className="stroke-primary transition-all duration-300 ease-in-out"
      strokeWidth="1"
      strokeLinecap="round"
      strokeDasharray={128.81}
      strokeDashoffset={128.81 * (1 - progress / 100)}
    />
  </svg>
);

const FileItem = ({ fileStatus }: { fileStatus: FileStatus }) => (
  <div className="flex gap-3">
    <img
      src={URL.createObjectURL(fileStatus.file)}
      alt={fileStatus.file.name}
      className="size-12 flex-shrink-0 rounded-sm object-cover"
    />
    <div className="flex min-w-0 flex-1 flex-col justify-center">
      <div className="flex flex-col items-start justify-center gap-1">
        <p className="w-full truncate text-sm font-medium">
          {fileStatus.file.name.split(".").slice(0, -1).join(".")}
        </p>
        {fileStatus.status === "completed" ? (
          <Button variant="link" className="h-auto w-fit justify-start p-0">
            Download
          </Button>
        ) : (
          <p className="text-muted-foreground whitespace-nowrap text-xs">
            {Math.round(fileStatus.progress)}%
          </p>
        )}
      </div>
    </div>
  </div>
);
