"use client";

import { Keyboard } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  type KeyboardShortcut,
  useKeyboardShortcutsHelp,
} from "@/hooks/use-keyboard-shortcuts-help";
import { useKeybindingsStore } from "@/stores/keybindings-store";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";

export function KeyboardShortcutsHelp() {
  const [open, setOpen] = useState(false);
  const [recordingShortcut, setRecordingShortcut] =
    useState<KeyboardShortcut | null>(null);

  const {
    updateKeybinding,
    removeKeybinding,
    getKeybindingString,
    validateKeybinding,
    getKeybindingsForAction,
    setIsRecording,
    resetToDefaults,
    isRecording,
  } = useKeybindingsStore();

  // Get shortcuts from centralized hook
  const { shortcuts } = useKeyboardShortcutsHelp();

  const categories = Array.from(new Set(shortcuts.map((s) => s.category)));

  useEffect(() => {
    if (!isRecording || !recordingShortcut) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const keyString = getKeybindingString(e);
      if (keyString) {
        // Auto-save the new keybinding
        const conflict = validateKeybinding(
          keyString,
          recordingShortcut.action,
        );
        if (conflict) {
          toast.error(
            `Key "${keyString}" is already bound to "${conflict.existingAction}"`,
          );
          setRecordingShortcut(null);
          return;
        }

        // Remove old keybindings for this action
        const oldKeys = getKeybindingsForAction(recordingShortcut.action);
        oldKeys.forEach((key) => removeKeybinding(key));

        // Add new keybinding
        updateKeybinding(keyString, recordingShortcut.action);

        setIsRecording(false);
        setRecordingShortcut(null);
      }
    };

    const handleClickOutside = () => {
      setRecordingShortcut(null);
      setIsRecording(false);
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("click", handleClickOutside);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("click", handleClickOutside);
    };
  }, [
    recordingShortcut,
    getKeybindingString,
    updateKeybinding,
    removeKeybinding,
    validateKeybinding,
    getKeybindingsForAction,
    setIsRecording,
    isRecording,
  ]);

  const handleStartRecording = (shortcut: KeyboardShortcut) => {
    setRecordingShortcut(shortcut);
    setIsRecording(true);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="text" size="sm" className="gap-2">
          <Keyboard />
          Shortcuts
        </Button>
      </DialogTrigger>
      <DialogContent className="flex max-h-[80vh] max-w-2xl flex-col p-0">
        <DialogHeader className="flex-shrink-0 p-6 pb-0">
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            Keyboard Shortcuts
          </DialogTitle>
          <DialogDescription>
            Speed up your video editing workflow with these keyboard shortcuts.
            Click any shortcut key to edit it.
          </DialogDescription>
        </DialogHeader>

        <div className="scrollbar-thin flex-grow overflow-y-auto">
          <div className="space-y-6 p-6 pt-2">
            {categories.map((category) => (
              <div key={category} className="flex flex-col gap-1">
                <h3 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                  {category}
                </h3>
                <div className="space-y-1">
                  {shortcuts
                    .filter((shortcut) => shortcut.category === category)
                    .map((shortcut) => (
                      <ShortcutItem
                        key={shortcut.action}
                        shortcut={shortcut}
                        isRecording={
                          shortcut.action === recordingShortcut?.action
                        }
                        onStartRecording={handleStartRecording}
                      />
                    ))}
                </div>
              </div>
            ))}
          </div>
        </div>
        <DialogFooter className="p-4 pt-0">
          <Button size="sm" variant="destructive" onClick={resetToDefaults}>
            Reset to default
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ShortcutItem({
  shortcut,
  isRecording,
  onStartRecording,
}: {
  shortcut: KeyboardShortcut;
  isRecording: boolean;
  onStartRecording: (shortcut: KeyboardShortcut) => void;
}) {
  // Filter out lowercase duplicates for display - if both "j" and "J" exist, only show "J"
  const displayKeys = shortcut.keys.filter((key: string) => {
    if (
      key.includes("Cmd") &&
      shortcut.keys.includes(key.replace("Cmd", "Ctrl"))
    )
      return false;

    return true;
  });

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        {shortcut.icon && (
          <div className="text-muted-foreground">{shortcut.icon}</div>
        )}
        <span className="text-sm">{shortcut.description}</span>
      </div>
      <div className="flex items-center gap-2">
        {displayKeys.map((key: string, index: number) => (
          <div key={key} className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              {key.split("+").map((keyPart: string, partIndex: number) => {
                const keyId = `${shortcut.id}-${index}-${partIndex}`;
                return (
                  <EditableShortcutKey
                    key={keyId}
                    isRecording={isRecording}
                    onStartRecording={() => onStartRecording(shortcut)}
                  >
                    {keyPart}
                  </EditableShortcutKey>
                );
              })}
            </div>
            {index < displayKeys.length - 1 && (
              <span className="text-muted-foreground text-xs">or</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function EditableShortcutKey({
  children,
  isRecording,
  onStartRecording,
}: {
  children: React.ReactNode;
  isRecording: boolean;
  onStartRecording: () => void;
}) {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onStartRecording();
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleClick}
      title={
        isRecording ? "Press any key combination..." : "Click to edit shortcut"
      }
    >
      {children}
    </Button>
  );
}
