import { createIcon } from "./create-icon";
import { ICON_DEFINITIONS } from "./registry";

export const GoogleIcon = createIcon({
	definition: ICON_DEFINITIONS.google,
});

export const GithubIcon = createIcon({
	definition: ICON_DEFINITIONS.github,
});

export const VercelIcon = createIcon({
	definition: ICON_DEFINITIONS.vercel,
});

export const DataBuddyIcon = createIcon({
	definition: ICON_DEFINITIONS.databuddy,
});

export const MarbleIcon = createIcon({
	definition: ICON_DEFINITIONS.marble,
});

export const BackgroundIcon = createIcon({
	definition: ICON_DEFINITIONS.background,
});

export const SocialsIcon = createIcon({
	definition: ICON_DEFINITIONS.socials,
});

export const TransitionUpIcon = createIcon({
	definition: ICON_DEFINITIONS.transitionUp,
});

export const MenuIcon = createIcon({
	definition: ICON_DEFINITIONS.menu,
});

export const PencilIcon = createIcon({
	definition: ICON_DEFINITIONS.pencil,
});

export const LeftArrowIcon = createIcon({
	definition: ICON_DEFINITIONS.leftArrow,
});

export const TrashIcon = createIcon({
	definition: ICON_DEFINITIONS.trash,
});

export type { IconDefinition, IconNode, IconProps } from "./types";
export { BaseIcon } from "./base-icon";
export { createIcon } from "./create-icon";
