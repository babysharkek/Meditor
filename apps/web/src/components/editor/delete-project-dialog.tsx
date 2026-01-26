import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";

export function DeleteProjectDialog({
	isOpen,
	onOpenChange,
	onConfirm,
	projectNames,
}: {
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
	onConfirm: () => void;
	projectNames: string[];
}) {
	const count = projectNames.length;
	const isSingle = count === 1;
	const singleName = isSingle ? projectNames[0] : null;

	return (
		<Dialog open={isOpen} onOpenChange={onOpenChange}>
			<DialogContent
				onOpenAutoFocus={(event) => {
					event.preventDefault();
					event.stopPropagation();
				}}
			>
				<DialogHeader>
					<DialogTitle>
						{singleName ? (
							<>
								{"Delete '"}
								<span className="inline-block max-w-[300px] truncate align-bottom">
									{singleName}
								</span>
								{"'?"}
							</>
						) : (
							`Delete ${count} projects?`
						)}
					</DialogTitle>
					<DialogDescription>
						{isSingle
							? "Are you sure you want to delete this project? This action cannot be undone."
							: `Are you sure you want to delete these ${count} projects? This action cannot be undone.`}
					</DialogDescription>
				</DialogHeader>
				<DialogFooter>
					<Button
						variant="text"
						onClick={(e) => {
							e.preventDefault();
							e.stopPropagation();
							onOpenChange(false);
						}}
					>
						Cancel
					</Button>
					<Button variant="destructive" onClick={onConfirm}>
						Delete
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
