"use client";

import { Button } from "./ui/button";
import { Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/utils/ui";

interface ThemeToggleProps {
	className?: string;
	iconClassName?: string;
	onToggle?: (e: React.MouseEvent<HTMLButtonElement>) => void;
}

export function ThemeToggle({
	className,
	iconClassName,
	onToggle,
}: ThemeToggleProps) {
	const { theme, setTheme } = useTheme();

	return (
		<Button
			size="icon"
			variant="text"
			className={cn("h-7", className)}
			onClick={(e) => {
				setTheme(theme === "dark" ? "light" : "dark");
				onToggle?.(e);
			}}
		>
			<Sun className={cn("!size-[1.1rem]", iconClassName)} />
			<span className="sr-only">{theme === "dark" ? "Light" : "Dark"}</span>
		</Button>
	);
}
