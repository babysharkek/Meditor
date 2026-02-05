"use client";

import Link from "next/link";
import { Button } from "./ui/button";
import Image from "next/image";
import { ThemeToggle } from "./theme-toggle";
import { HugeiconsIcon } from "@hugeicons/react";
import { cn } from "@/utils/ui";
import { DEFAULT_LOGO_URL } from "@/constants/site-constants";

export function Header() {
	return (
		<header className="bg-background shadow-background/85 sticky top-0 z-10 shadow-[0_30px_35px_15px_rgba(0,0,0,1)]">
			<div className="relative flex w-full items-center justify-between px-6 pt-4">
				<div className="relative z-10 flex items-center gap-6">
					<Link href="/" className="flex items-center gap-3">
						<Image
							src={DEFAULT_LOGO_URL}
							alt="OpenCut Logo"
							className="invert dark:invert-0"
							width={32}
							height={32}
						/>
					</Link>
					<div className="hidden items-center gap-3 md:flex">
						<ThemeToggle />
					</div>
				</div>
			</div>
		</header>
	);
}
