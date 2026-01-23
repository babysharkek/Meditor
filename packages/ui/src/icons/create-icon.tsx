import { BaseIcon } from "./base-icon";
import type { IconDefinition, IconNode, IconProps } from "./types";
import type { JSX } from "react";

type CreateIconParams = {
	definition: IconDefinition;
};

function renderIconNodes({ nodes }: { nodes: IconNode }) {
	const elements: Array<JSX.Element> = [];

	for (const [index, node] of nodes.entries()) {
		const Element = node.element;
		const children = node.children
			? renderIconNodes({ nodes: node.children })
			: undefined;

		elements.push(
			<Element key={`${node.element}-${index}`} {...node.props}>
				{children}
			</Element>,
		);
	}

	return elements;
}

export function createIcon({ definition }: CreateIconParams) {
	function Icon({ title, size, ...props }: IconProps) {
		const iconTitle = title ?? definition.title;

		return (
			<BaseIcon
				title={iconTitle}
				size={size}
				viewBox={definition.viewBox}
				{...props}
			>
				{renderIconNodes({ nodes: definition.nodes })}
			</BaseIcon>
		);
	}

	Icon.displayName = `${definition.title}Icon`;

	return Icon;
}
