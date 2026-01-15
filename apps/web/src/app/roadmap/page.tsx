import { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { ReactMarkdownWrapper } from "@/components/ui/react-markdown-wrapper";
import { cn } from "@/lib/utils";
import { BasePage } from "@/app/base-page";
import { GitHubContributeSection } from "@/components/gitHub-contribute-section";

type StatusType = "complete" | "pending" | "default" | "info";

interface Status {
  text: string;
  type: StatusType;
}

interface RoadmapItem {
  title: string;
  description: string;
  status: Status;
}

const roadmapItems: RoadmapItem[] = [
  {
    title: "Start",
    description:
      "This is where it all started. Repository created, initial project structure, and the vision for a free, open-source video editor. [Check out the first tweet](https://x.com/mazeincoding/status/1936706642512388188) to see where it started.",
    status: {
      text: "Completed",
      type: "complete",
    },
  },
  {
    title: "Core UI",
    description:
      "Built the foundation - main layout, header, sidebar, timeline container, and basic component structure. Not all functionality yet, but the UI framework that everything else builds on.",
    status: {
      text: "Completed",
      type: "complete",
    },
  },
  {
    title: "Basic Functionality",
    description:
      "The heart of any video editor. Timeline zoom in/out, making clips longer/shorter, dragging elements around, selection, playhead scrubbing. **This part has to be fucking perfect** because it's what users interact with 99% of the time.",
    status: {
      text: "In progress",
      type: "pending",
    },
  },
  {
    title: "Export/preview logic",
    description:
      "The foundation that enables everything else. Real-time preview, video rendering, export functionality. Once this works, we can add effects, filters, transitions - basically everything that makes a video editor powerful.",
    status: {
      text: "Completed",
      type: "complete",
    },
  },
  {
    title: "Desktop/mobile app",
    description:
      "The foundation that enables everything else. Real-time preview, video rendering, export functionality. Once this works, we can add effects, filters, transitions - basically everything that makes a video editor powerful.",
    status: {
      text: "In progress",
      type: "pending",
    },
  },
  {
    title: "Text",
    description:
      "After media, text is the next most important thing. Font selection with custom font imports, text stroke, colors. All the text essential text properties.",
    status: {
      text: "In progress",
      type: "pending",
    },
  },
  {
    title: "Effects",
    description:
      "Adding visual effects to both text and media. Blur, brightness, contrast, saturation, filters, and all the creative tools that make videos pop. This is where the magic happens.",
    status: {
      text: "Not started",
      type: "default",
    },
  },
  {
    title: "Transitions",
    description:
      "Smooth transitions between clips. Fade in/out, slide, zoom, dissolve, and custom transition effects.",
    status: {
      text: "Not started",
      type: "default",
    },
  },
  {
    title: "Refine from here",
    description:
      "Once we nail the above, we have a **solid foundation** to build anything. Advanced features, performance optimizations, mobile support, desktop app.",
    status: {
      text: "Future",
      type: "info",
    },
  },
];

export const metadata: Metadata = {
  title: "Roadmap - OpenCut",
  description:
    "See what's coming next for OpenCut - the free, open-source video editor that respects your privacy.",
  openGraph: {
    title: "OpenCut Roadmap - What's Coming Next",
    description:
      "See what's coming next for OpenCut - the free, open-source video editor that respects your privacy.",
    type: "website",
    images: [
      {
        url: "/open-graph/roadmap.jpg",
        width: 1200,
        height: 630,
        alt: "OpenCut Roadmap",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "OpenCut Roadmap - What's Coming Next",
    description:
      "See what's coming next for OpenCut - the free, open-source video editor that respects your privacy.",
    images: ["/open-graph/roadmap.jpg"],
  },
};

export default function RoadmapPage() {
  return (
    <BasePage
      title="Roadmap"
      description="What's coming next for OpenCut (last updated: July 14, 2025)"
    >
      <div className="mx-auto flex max-w-4xl flex-col gap-16">
        <div className="flex flex-col gap-6">
          {roadmapItems.map((item, index) => (
            <RoadmapItem key={index} item={item} index={index} />
          ))}
        </div>
        <GitHubContributeSection
          title="Want to help?"
          description="OpenCut is open source and built by the community. Every contribution,
          no matter how small, helps us build the best free video editor
          possible."
        />
      </div>
    </BasePage>
  );
}

function RoadmapItem({ item, index }: { item: RoadmapItem; index: number }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 text-lg font-medium">
        <span className="select-none leading-normal">{index + 1}</span>
        <h3>{item.title}</h3>
        <StatusBadge status={item.status} className="ml-1" />
      </div>
      <div className="text-foreground/70 leading-relaxed">
        <ReactMarkdownWrapper>{item.description}</ReactMarkdownWrapper>
      </div>
    </div>
  );
}

function StatusBadge({
  status,
  className,
}: {
  status: Status;
  className?: string;
}) {
  return (
    <Badge
      className={cn("shadow-none", className, {
        "bg-green-500! text-white": status.type === "complete",
        "bg-yellow-500! text-white": status.type === "pending",
        "bg-blue-500! text-white": status.type === "info",
        "bg-foreground/10! text-accent-foreground": status.type === "default",
      })}
    >
      {status.text}
    </Badge>
  );
}
