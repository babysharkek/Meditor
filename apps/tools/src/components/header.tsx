"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "./ui/button";
import Image from "next/image";
import { DEFAULT_LOGO_URL } from "@/constants/site-constants";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { CheckIcon } from "lucide-react";

export function Header({rightContent}: {rightContent?: React.ReactNode}) {
  const pathname = usePathname();
  const tools = {
    video: {
      label: "Video tools",
      items: [
        { name: "Video Editor", href: "/video-editor" },
        { name: "Video Compressor", href: "/video-compressor" },
        { name: "Video Converter", href: "/video-converter" },
      ],
    },
    image: {
      label: "Image tools",
      items: [
        { name: "BG Remover", href: "/bg-remover" },
        { name: "Color Replacer", href: "/color-replacer" },
      ],
    },
  };

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
          <nav className="flex items-center gap-6">
            {Object.keys(tools).map((category) => (
              <HoverCard openDelay={500} closeDelay={300}>
                <HoverCardTrigger asChild>
                  <Button variant="text" className="p-0 font-normal">
                    {tools[category as keyof typeof tools].label}
                  </Button>
                </HoverCardTrigger>
                <HoverCardContent align="start" className="w-48 p-2">
                  <div className="flex flex-col">
                    {tools[category as keyof typeof tools].items.map((tool) => {
                      const isActive = pathname === tool.href;
                      return (
                        <div key={tool.href} className="mb-1 last:mb-0">
                          <Link
                            href={tool.href}
                            className={`group flex items-center justify-between rounded-sm px-3 py-2 text-sm transition-colors ${
                              isActive ? "bg-primary/10" : "hover:bg-accent/75"
                            }`}
                          >
                            {tool.name}
                            {isActive && (
                              <CheckIcon className="text-primary size-4" />
                            )}
                          </Link>
                        </div>
                      );
                    })}
                  </div>
                </HoverCardContent>
              </HoverCard>
            ))}
          </nav>
        </div>
        {rightContent}
      </div>
    </header>
  );
}
