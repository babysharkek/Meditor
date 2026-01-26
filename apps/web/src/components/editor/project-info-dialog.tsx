import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import type { TProjectMetadata } from "@/types/project";
import { formatDate } from "@/utils/date";
import { formatTimeCode } from "@/lib/time";

function InfoRow({
	label,
	value,
}: {
	label: string;
	value: string | React.ReactNode;
}) {
	return (
		<div className="flex justify-between items-center py-2 last:pb-0 border-b border-border/50 last:border-b-0">
			<span className="text-muted-foreground text-sm">{label}</span>
			<span className="text-sm font-medium">{value}</span>
		</div>
	);
}

export function ProjectInfoDialog({
	isOpen,
	onOpenChange,
	project,
}: {
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
	project: TProjectMetadata;
}) {
	const durationFormatted =
		project.duration > 0
			? formatTimeCode({
					timeInSeconds: project.duration,
					format: project.duration >= 3600 ? "HH:MM:SS" : "MM:SS",
				})
			: "0:00";

	return (
		<Dialog open={isOpen} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle className="truncate max-w-[350px]">
						{project.name}
					</DialogTitle>
				</DialogHeader>

				<div className="flex flex-col">
					<InfoRow label="Duration" value={durationFormatted} />
					<InfoRow
						label="Created"
						value={formatDate({ date: project.createdAt })}
					/>
					<InfoRow
						label="Modified"
						value={formatDate({ date: project.updatedAt })}
					/>
					<InfoRow
						label="Project ID"
						value={
							<code className="text-xs bg-muted px-1.5 py-0.5 rounded">
								{project.id.slice(0, 8)}
							</code>
						}
					/>
				</div>
			</DialogContent>
		</Dialog>
	);
}
