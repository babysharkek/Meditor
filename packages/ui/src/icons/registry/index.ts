import type { IconDefinition } from "../types";
import { BRAND_ICONS } from "./brand";
import { UI_ICONS } from "./ui";

export const ICON_DEFINITIONS = {
	...BRAND_ICONS,
	...UI_ICONS,
} satisfies Record<string, IconDefinition>;
