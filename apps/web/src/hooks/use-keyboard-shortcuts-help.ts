"use client";

import { useMemo } from "react";
import { useKeybindingsStore } from "@/stores/keybindings-store";
import { ACTIONS, type TAction } from "@/lib/actions";
import {
  getPlatformAlternateKey,
  getPlatformSpecialKey,
} from "@/lib/keyboard-utils";

export interface KeyboardShortcut {
  id: string;
  keys: string[];
  description: string;
  category: string;
  action: TAction;
  icon?: React.ReactNode;
}

// Convert key binding format to display format
const formatKey = (key: string): string => {
  return key
    .replace("ctrl", getPlatformSpecialKey())
    .replace("alt", getPlatformAlternateKey())
    .replace("shift", "Shift")
    .replace("left", "←")
    .replace("right", "→")
    .replace("up", "↑")
    .replace("down", "↓")
    .replace("space", "Space")
    .replace("home", "Home")
    .replace("enter", "Enter")
    .replace("end", "End")
    .replace("delete", "Delete")
    .replace("backspace", "Backspace")
    .replace("-", "+");
};

export const useKeyboardShortcutsHelp = () => {
  const { keybindings } = useKeybindingsStore();

  const shortcuts = useMemo(() => {
    const result: KeyboardShortcut[] = [];

    // Group keybindings by action
    const actionToKeys: Record<string, Array<string>> = {};

    for (const [key, action] of Object.entries(keybindings)) {
      if (action) {
        if (!actionToKeys[action]) {
          actionToKeys[action] = [];
        }
        actionToKeys[action].push(formatKey(key));
      }
    }

    // Convert to shortcuts format
    for (const [actionId, keys] of Object.entries(actionToKeys)) {
      if (!Object.prototype.hasOwnProperty.call(ACTIONS, actionId)) {
        continue;
      }

      const action = actionId as TAction;
      const actionDef = ACTIONS[action];
      result.push({
        id: actionId,
        keys,
        description: actionDef.description,
        category: actionDef.category,
        action,
      });
    }

    // Sort shortcuts by category first, then by description to ensure consistent ordering
    return result.sort((a, b) => {
      if (a.category !== b.category) {
        return a.category.localeCompare(b.category);
      }
      return a.description.localeCompare(b.description);
    });
  }, [keybindings]);

  return {
    shortcuts,
  };
};
