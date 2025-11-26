import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function capitalizeFirstLetter({ string }: { string: string }) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

export function generateUUID(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);

  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = [...bytes].map((b) => b.toString(16).padStart(2, "0"));

  return (
    hex.slice(0, 4).join("") +
    "-" +
    hex.slice(4, 6).join("") +
    "-" +
    hex.slice(6, 8).join("") +
    "-" +
    hex.slice(8, 10).join("") +
    "-" +
    hex.slice(10, 16).join("")
  );
}

export function isTypableDOMElement({ el }: { el: HTMLElement }): boolean {
  if (el.isContentEditable) return true;

  if (el.tagName === "INPUT") {
    return !(el as HTMLInputElement).disabled;
  }

  if (el.tagName === "TEXTAREA") {
    return !(el as HTMLTextAreaElement).disabled;
  }

  return false;
}

export function isAppleDevice(): boolean {
  return /(Mac|iPhone|iPod|iPad)/i.test(navigator.platform);
}
