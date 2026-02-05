"use client";

import { Button } from "../ui/button";
import { ArrowRight } from "lucide-react";
import Image from "next/image";
import { Handlebars } from "./handlebars";
import Link from "next/link";

export function Hero() {
	return (
		<div className="relative flex min-h-[calc(100svh-4.5rem)] flex-col items-center justify-between px-4 text-center">
			<Image
				className="absolute top-0 left-0 -z-50 size-full object-cover opacity-55 invert dark:invert-0"
				src="/landing-page-dark.png"
				height={1903.5}
				width={1269}
				alt="landing-page.bg"
			/>
			<div className="pointer-events-none absolute inset-0 -z-40">
				<div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(99,102,241,0.40),rgba(16,185,129,0.22),transparent_60%)]" />
				<div className="absolute inset-0 bg-gradient-to-b from-background/0 via-background/55 to-background" />
			</div>
			<div className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center">
				<div className="inline-block text-4xl font-bold tracking-tighter md:text-[4rem]">
					<h1>Logic Studio</h1>
					<Handlebars>Video editor</Handlebars>
				</div>

				<p className="text-muted-foreground mx-auto mt-10 max-w-xl text-base font-light tracking-wide sm:text-xl">
					A simple but powerful video editor that gets the job done. Works on
					any platform.
				</p>

				<div className="mt-8 flex justify-center gap-8">
					<Link href="/projects">
						<Button
							variant="foreground"
							type="submit"
							size="lg"
							className="h-11 text-base"
						>
							Try early beta
							<ArrowRight className="ml-0.5" />
						</Button>
					</Link>
				</div>
			</div>
		</div>
	);
}
