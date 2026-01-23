import type { SVGProps, JSX } from "react";

export type IconProps = Omit<
	SVGProps<SVGSVGElement>,
	"children" | "width" | "height"
> & {
	size?: number;
	title?: string;
};

export type IconNode = Array<{
	element: keyof JSX.IntrinsicElements;
	props: Record<string, string | number | undefined>;
	children?: IconNode;
}>;

export type IconDefinition = {
	title: string;
	viewBox?: string;
	nodes: IconNode;
};
