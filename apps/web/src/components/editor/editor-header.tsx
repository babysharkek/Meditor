"use client";

import { Button } from "../ui/button";
import { ChevronDown } from "lucide-react";
import { KeyboardShortcutsHelp } from "../keyboard-shortcuts-help";
import { useState } from "react";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import Link from "next/link";
import { RenameProjectDialog } from "../rename-project-dialog";
import { DeleteProjectDialog } from "./delete-project-dialog";
import { useRouter } from "next/navigation";
import { FaDiscord } from "react-icons/fa6";
import { ExportButton } from "./export-button";
import { ThemeToggle } from "../theme-toggle";
import { SOCIAL_LINKS } from "@/constants/site-constants";
import { toast } from "sonner";
import { useEditor } from "@/hooks/use-editor";
import { OcLeftArrowIcon, OcPencilIcon, OcTrashIcon } from "@opencut/ui/icons";

export function EditorHeader() {
	return (
		<header className="bg-background flex h-[3.2rem] items-center justify-between px-3 pt-0.5">
			<div className="flex items-center gap-2">
				<ProjectDropdown />
			</div>
			<nav className="flex items-center gap-2">
				<KeyboardShortcutsHelp />
				<ExportButton />
				<ThemeToggle />
			</nav>
		</header>
	);
}

function ProjectDropdown() {
	const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
	const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
	const [isExiting, setIsExiting] = useState(false);
	const router = useRouter();
	const editor = useEditor();
	const activeProject = editor.project.getActive();

	const handleExit = async () => {
		if (isExiting) return;
		setIsExiting(true);

		try {
			await editor.project.prepareExit();
			editor.project.closeProject();
		} catch (error) {
			console.error("Failed to prepare project exit:", error);
		} finally {
			editor.project.closeProject();
			router.push("/projects");
		}
	};

	const handleSaveProjectName = async (newName: string) => {
		if (
			activeProject &&
			newName.trim() &&
			newName !== activeProject.metadata.name
		) {
			try {
				await editor.project.renameProject({
					id: activeProject.metadata.id,
					name: newName.trim(),
				});
			} catch (error) {
				toast.error("Failed to rename project", {
					description:
						error instanceof Error ? error.message : "Please try again",
				});
			} finally {
				setIsRenameDialogOpen(false);
			}
		}
	};

	const handleDeleteProject = async () => {
		if (activeProject) {
			try {
				await editor.project.deleteProject({ id: activeProject.metadata.id });
				router.push("/projects");
			} catch (error) {
				toast.error("Failed to delete project", {
					description:
						error instanceof Error ? error.message : "Please try again",
				});
			} finally {
				setIsDeleteDialogOpen(false);
			}
		}
	};

	return (
		<>
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button
						variant="secondary"
						className="flex h-auto items-center justify-center px-2.5 py-1.5"
					>
						<ChevronDown className="text-muted-foreground" />
						<span className="mr-2 text-[0.85rem]">
							{activeProject?.metadata.name}
						</span>
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="start" className="z-100 w-52">
					<DropdownMenuItem
						className="flex items-center gap-1.5"
						onClick={handleExit}
						disabled={isExiting}
					>
						<OcLeftArrowIcon className="size-4" />
						Projects
					</DropdownMenuItem>
					<DropdownMenuItem
						className="flex items-center gap-1.5"
						onClick={() => setIsRenameDialogOpen(true)}
					>
						<OcPencilIcon className="size-4" />
						Rename project
					</DropdownMenuItem>
					<DropdownMenuItem
						variant="destructive"
						className="flex items-center gap-1.5"
						onClick={() => setIsDeleteDialogOpen(true)}
					>
						<OcTrashIcon className="size-4" />
						Delete Project
					</DropdownMenuItem>
					<DropdownMenuSeparator />
					<DropdownMenuItem asChild>
						<Link
							href={SOCIAL_LINKS.discord}
							target="_blank"
							rel="noopener noreferrer"
							className="flex items-center gap-1.5"
						>
							<FaDiscord className="size-4" />
							Discord
						</Link>
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
			<RenameProjectDialog
				isOpen={isRenameDialogOpen}
				onOpenChange={setIsRenameDialogOpen}
				onConfirm={(newName) => handleSaveProjectName(newName)}
				projectName={activeProject?.metadata.name || ""}
			/>
			<DeleteProjectDialog
				isOpen={isDeleteDialogOpen}
				onOpenChange={setIsDeleteDialogOpen}
				onConfirm={handleDeleteProject}
				projectName={activeProject?.metadata.name || ""}
			/>
		</>
	);
}
