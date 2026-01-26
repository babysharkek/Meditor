import * as React from "react";
import { Slot as SlotPrimitive } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/utils/ui";

const buttonVariants = cva(
	"inline-flex items-center cursor-pointer justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium transition-colors focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
	{
		variants: {
			variant: {
				default:
					"bg-foreground text-background shadow-sm hover:bg-foreground/90",
				foreground:
					"bg-background text-foreground",
				primary:
					"bg-primary text-primary-foreground hover:bg-primary/90",
				"primary-gradient":
					"bg-gradient-to-r from-cyan-400 to-blue-500 text-white hover:opacity-85 transition-opacity",
				destructive:
					"bg-destructive text-destructive-foreground hover:bg-destructive/80",
				"destructive-foreground":
					"border bg-background hover:bg-destructive/15 text-destructive",
				outline:
					"border border-border bg-transparent transition-colors hover:bg-accent",
				secondary:
					"bg-secondary text-secondary-foreground hover:bg-foreground/15 border border-input",
				text: "bg-transparent rounded-none !opacity-100",
				link: "text-primary underline-offset-4 hover:underline !p-0 !h-auto",
			},
			size: {
				default: "h-9 px-4 py-2",
				sm: "h-8 rounded-full px-3 text-xs",
				lg: "h-10 rounded-full p-5 px-6",
				icon: "size-7 rounded-sm",
				text: "p-0",
			},
		},
		defaultVariants: {
			variant: "default",
			size: "default",
		},
	},
);

export interface ButtonProps
	extends React.ButtonHTMLAttributes<HTMLButtonElement>,
		VariantProps<typeof buttonVariants> {
	asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
	({ className, variant, size, asChild = false, ...props }, ref) => {
		const Comp = asChild ? SlotPrimitive.Slot : "button";
		const effectiveSize = size ?? (variant === "text" ? "text" : "default");
		return (
			<Comp
				className={cn(buttonVariants({ variant, size: effectiveSize, className }))}
				ref={ref}
				{...props}
			/>
		);
	},
);
Button.displayName = "Button";

export { Button, buttonVariants };
