import { isAppleDevice } from "./utils";

export function getPlatformSpecialKey(): string {
  return isAppleDevice() ? "⌘" : "Ctrl";
}

export function getPlatformAlternateKey(): string {
  return isAppleDevice() ? "⌥" : "Alt";
}
