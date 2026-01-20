import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { webEnv } from "@opencut/env/web";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function formatDate({ date }: { date: Date }): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function capitalizeFirstLetter({ string }: { string: string }) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

export function uppercase({ string }: { string: string }) {
  return string.toUpperCase();
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

export function isTypableDOMElement({
  element,
}: {
  element: HTMLElement;
}): boolean {
  if (element.isContentEditable) return true;

  if (element.tagName === "INPUT") {
    return !(element as HTMLInputElement).disabled;
  }

  if (element.tagName === "TEXTAREA") {
    return !(element as HTMLTextAreaElement).disabled;
  }

  return false;
}

export function isAppleDevice(): boolean {
  return /(Mac|iPhone|iPod|iPad)/i.test(navigator.platform);
}

export function clamp({
  value,
  min,
  max,
}: {
  value: number;
  min: number;
  max: number;
}): number {
  return Math.max(min, Math.min(max, value));
}
