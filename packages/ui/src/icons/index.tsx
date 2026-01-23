import { createIcon } from "./create-icon";
import { ICON_DEFINITIONS } from "./registry";

export const OcGoogleIcon = createIcon({
	definition: ICON_DEFINITIONS.google,
});

export const OcGithubIcon = createIcon({
	definition: ICON_DEFINITIONS.github,
});

export const OcVercelIcon = createIcon({
	definition: ICON_DEFINITIONS.vercel,
});

export const OcDataBuddyIcon = createIcon({
	definition: ICON_DEFINITIONS.databuddy,
});

export const OcMarbleIcon = createIcon({
	definition: ICON_DEFINITIONS.marble,
});

export const OcBackgroundIcon = createIcon({
	definition: ICON_DEFINITIONS.background,
});

export const OcSocialsIcon = createIcon({
	definition: ICON_DEFINITIONS.socials,
});

export const OcTransitionUpIcon = createIcon({
	definition: ICON_DEFINITIONS.transitionUp,
});

export const OcMenuIcon = createIcon({
	definition: ICON_DEFINITIONS.menu,
});

export const OcPencilIcon = createIcon({
	definition: ICON_DEFINITIONS.pencil,
});

export const OcLeftArrowIcon = createIcon({
	definition: ICON_DEFINITIONS.leftArrow,
});

export const OcTrashIcon = createIcon({
	definition: ICON_DEFINITIONS.trash,
});

export type { IconDefinition, IconNode, IconProps } from "./types";
export { BaseIcon } from "./base-icon";
export { createIcon } from "./create-icon";
