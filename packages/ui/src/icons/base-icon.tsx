import { useId, type ReactNode } from "react";
import type { IconProps } from "./types";

type BaseIconProps = Omit<IconProps, "title"> & {
	title: string;
	children: ReactNode;
};

export function BaseIcon({
	title,
	size = 24,
	viewBox = "0 0 24 24",
	children,
	...props
}: BaseIconProps) {
	const titleId = useId();

	return (
		<svg
			{...props}
			width={size}
			height={size}
			viewBox={viewBox}
			role="img"
			aria-labelledby={titleId}
		>
			<title id={titleId}>{title}</title>
			{children}
		</svg>
	);
}
