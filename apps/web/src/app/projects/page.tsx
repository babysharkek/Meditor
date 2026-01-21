"use client";

import {
  Calendar,
  ChevronLeft,
  MoreHorizontal,
  ArrowDown01,
  Plus,
  Search,
  Trash2,
  Video,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { KeyboardEvent, MouseEvent } from "react";
import { useState, useEffect } from "react";
import { DeleteProjectDialog } from "@/components/editor/delete-project-dialog";
import { RenameProjectDialog } from "@/components/rename-project-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { MigrationDialog } from "@/components/editor/migration-dialog";
import type { TProjectMetadata } from "@/types/project";
import { toast } from "sonner";
import { useEditor } from "@/hooks/use-editor";
import { formatDate } from "@/utils/date";

export default function ProjectsPage() {
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedProjects, setSelectedProjects] = useState<Set<string>>(
    new Set(),
  );
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOption, setSortOption] = useState("createdAt-desc");
  const router = useRouter();
  const editor = useEditor();

  useEffect(() => {
    if (!editor.project.getIsInitialized()) {
      editor.project.loadAllProjects();
    }
  }, [editor.project]);

  const handleCreateProject = async () => {
    try {
      const projectId = await editor.project.createNewProject({
        name: "New project",
      });
      router.push(`/editor/${projectId}`);
    } catch (error) {
      toast.error("Failed to create project", {
        description:
          error instanceof Error ? error.message : "Please try again",
      });
    }
  };

  const toggleSortOption = ({
    sortField,
  }: {
    sortField: "createdAt" | "name";
  }) => {
    const isSameField = sortOption.startsWith(sortField);
    const nextSortOption = isSameField
      ? `${sortField}-${sortOption.endsWith("asc") ? "desc" : "asc"}`
      : `${sortField}-asc`;

    setSortOption(nextSortOption);
  };

  const handleSelectProject = ({
    projectId,
    checked,
  }: {
    projectId: string;
    checked: boolean;
  }) => {
    const newSelected = new Set(selectedProjects);
    if (checked) {
      newSelected.add(projectId);
    } else {
      newSelected.delete(projectId);
    }
    setSelectedProjects(newSelected);
  };

  const handleSelectAll = ({ checked }: { checked: boolean }) => {
    if (checked) {
      setSelectedProjects(
        new Set(projectsToDisplay.map((project) => project.id)),
      );
    } else {
      setSelectedProjects(new Set());
    }
  };

  const handleCancelSelection = () => {
    setIsSelectionMode(false);
    setSelectedProjects(new Set());
  };

  const handleBulkDelete = async () => {
    try {
      await Promise.all(
        Array.from(selectedProjects).map((projectId) =>
          editor.project.deleteProject({ id: projectId }),
        ),
      );
    } catch (error) {
      toast.error("Failed to delete projects", {
        description:
          error instanceof Error ? error.message : "Please try again",
      });
    } finally {
      setSelectedProjects(new Set());
      setIsSelectionMode(false);
      setIsBulkDeleteDialogOpen(false);
    }
  };

  const projectsToDisplay = editor.project.getFilteredAndSortedProjects({
    searchQuery,
    sortOption,
  });

  const isAllSelected =
    projectsToDisplay.length > 0 &&
    selectedProjects.size === projectsToDisplay.length;

  const hasSomeSelected =
    selectedProjects.size > 0 &&
    selectedProjects.size < projectsToDisplay.length;

  const isLoading = editor.project.getIsLoading();
  const isInitialized = editor.project.getIsInitialized();

  return (
    <div className="bg-background min-h-screen">
      <MigrationDialog />
      <div className="flex h-16 w-full items-center justify-between px-6 pt-2">
        <Link
          href="/"
          className="hover:text-muted-foreground flex items-center gap-1 transition-colors"
        >
          <ChevronLeft className="size-5! shrink-0" />
          <span className="text-sm font-medium">Back</span>
        </Link>
        <div className="block md:hidden">
          {isSelectionMode ? (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancelSelection}
              >
                <X className="size-4!" />
                Cancel
              </Button>
              {selectedProjects.size > 0 && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setIsBulkDeleteDialogOpen(true)}
                >
                  <Trash2 className="size-4!" />
                  Delete ({selectedProjects.size})
                </Button>
              )}
            </div>
          ) : (
            <CreateButton onClick={handleCreateProject} />
          )}
        </div>
      </div>
      <main className="mx-auto max-w-6xl px-6 pt-6 pb-6">
        <div className="mb-8 flex items-center justify-between">
          <div className="flex flex-col gap-3">
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
              Your projects
            </h1>
            <p className="text-muted-foreground">
              {projectsToDisplay.length}{" "}
              {projectsToDisplay.length === 1 ? "project" : "projects"}
              {isSelectionMode && selectedProjects.size > 0 && (
                <span className="text-primary ml-2">
                  • {selectedProjects.size} selected
                </span>
              )}
            </p>
          </div>
          <div className="hidden md:block">
            {isSelectionMode ? (
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={handleCancelSelection}>
                  <X className="size-4!" />
                  Cancel
                </Button>
                {selectedProjects.size > 0 && (
                  <Button
                    variant="destructive"
                    onClick={() => setIsBulkDeleteDialogOpen(true)}
                  >
                    <Trash2 className="size-4!" />
                    Delete selected ({selectedProjects.size})
                  </Button>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsSelectionMode(true)}
                  disabled={projectsToDisplay.length === 0}
                >
                  Select projects
                </Button>
                <CreateButton onClick={handleCreateProject} />
              </div>
            )}
          </div>
        </div>

        <div className="mb-4 flex items-center justify-between gap-4">
          <div className="max-w-72 flex-1">
            <Input
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
          </div>
          <div className="flex items-center gap-0">
            <TooltipProvider>
              <Tooltip>
                <DropdownMenu>
                  <TooltipTrigger asChild>
                    <DropdownMenuTrigger asChild>
                      <Button
                        aria-label="sort projects"
                        size="icon"
                        variant="outline"
                        className="size-9 items-center justify-center"
                      >
                        <ArrowDown01
                          strokeWidth={1.5}
                          className="!size-[1.05rem]"
                          aria-hidden="true"
                        />
                      </Button>
                    </DropdownMenuTrigger>
                  </TooltipTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() =>
                        toggleSortOption({ sortField: "createdAt" })
                      }
                    >
                      Created{" "}
                      {sortOption.startsWith("createdAt") &&
                        (sortOption.endsWith("asc") ? "↑" : "↓")}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => toggleSortOption({ sortField: "name" })}
                    >
                      Name{" "}
                      {sortOption.startsWith("name") &&
                        (sortOption.endsWith("asc") ? "↑" : "↓")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <TooltipContent>
                  <p>
                    Sort by{" "}
                    {sortOption.startsWith("createdAt") ? "date" : "name"} (
                    {sortOption.endsWith("asc") ? "ascending" : "descending"})
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        {isSelectionMode && projectsToDisplay.length > 0 && (
          <button
            type="button"
            onClick={() => handleSelectAll({ checked: !isAllSelected })}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                handleSelectAll({ checked: !isAllSelected });
              }
            }}
            className="bg-muted/30 mb-6 flex w-full items-center gap-2 rounded-lg border p-4 hover:cursor-pointer"
            tabIndex={0}
          >
            <Checkbox
              checked={hasSomeSelected ? "indeterminate" : isAllSelected}
            />
            <span className="text-sm font-medium">
              {isAllSelected ? "Deselect all" : "Select all"}
            </span>
            <span className="text-muted-foreground text-sm">
              ({selectedProjects.size} of {projectsToDisplay.length} selected)
            </span>
          </button>
        )}

        {isLoading || !isInitialized ? (
          <ProjectsLoader />
        ) : projectsToDisplay.length === 0 ? (
          <EmptyState
            search={{
              query: searchQuery,
              onClearSearch: () => setSearchQuery(""),
            }}
            onCreateProject={handleCreateProject}
          />
        ) : (
          <div className="xs:grid-cols-2 grid grid-cols-1 gap-6 sm:grid-cols-3 lg:grid-cols-4">
            {projectsToDisplay.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                isSelectionMode={isSelectionMode}
                isSelected={selectedProjects.has(project.id)}
                onSelect={handleSelectProject}
              />
            ))}
          </div>
        )}
      </main>

      <DeleteProjectDialog
        isOpen={isBulkDeleteDialogOpen}
        onOpenChange={setIsBulkDeleteDialogOpen}
        onConfirm={handleBulkDelete}
      />
    </div>
  );
}

interface ProjectCardProps {
  project: TProjectMetadata;
  isSelectionMode?: boolean;
  isSelected?: boolean;
  onSelect?: ({
    projectId,
    checked,
  }: {
    projectId: string;
    checked: boolean;
  }) => void;
}

function ProjectCard({
  project,
  isSelectionMode = false,
  isSelected = false,
  onSelect,
}: ProjectCardProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const editor = useEditor();

  const handleDeleteProject = async () => {
    await editor.project.deleteProject({ id: project.id });
    setIsDropdownOpen(false);
  };

  const handleRenameProject = async ({ name }: { name: string }) => {
    await editor.project.renameProject({ id: project.id, name });
    setIsRenameDialogOpen(false);
  };

  const handleDuplicateProject = async () => {
    setIsDropdownOpen(false);
    await editor.project.duplicateProject({ id: project.id });
  };

  const handleCardClick = ({
    event,
  }: {
    event: MouseEvent<HTMLButtonElement>;
  }) => {
    if (isSelectionMode) {
      event.preventDefault();
      onSelect?.({ projectId: project.id, checked: !isSelected });
    }
  };

  const handleCardKeyDown = ({
    event,
  }: {
    event: KeyboardEvent<HTMLButtonElement>;
  }) => {
    if (isSelectionMode && (event.key === "Enter" || event.key === " ")) {
      event.preventDefault();
      onSelect?.({ projectId: project.id, checked: !isSelected });
    }
  };

  const cardContent = (
    <Card
      className={`bg-background overflow-hidden border-none p-0 transition-all ${isSelectionMode && isSelected ? "ring-primary ring-2" : ""
        }`}
    >
      <div
        className={`bg-muted relative aspect-square transition-opacity ${isDropdownOpen ? "opacity-65" : "opacity-100 group-hover:opacity-65"
          }`}
      >
        {isSelectionMode && (
          <div className="absolute top-3 left-3 z-10">
            <div className="bg-background/80 flex size-5 items-center justify-center rounded-full border backdrop-blur-xs">
              <Checkbox
                checked={isSelected}
                onCheckedChange={(checked) =>
                  onSelect?.({
                    projectId: project.id,
                    checked: checked === true,
                  })
                }
                onClick={(event) => event.stopPropagation()}
                className="size-4"
              />
            </div>
          </div>
        )}

        <div className="absolute inset-0">
          {project.thumbnail ? (
            <Image
              src={project.thumbnail}
              alt="Project thumbnail"
              fill
              className="object-cover"
            />
          ) : (
            <div className="bg-muted/50 flex h-full w-full items-center justify-center">
              <Video className="text-muted-foreground size-12 shrink-0" />
            </div>
          )}
        </div>
      </div>

      <CardContent className="flex flex-col gap-1 px-0 pt-5">
        <div className="flex items-start justify-between">
          <h3 className="group-hover:text-foreground/90 line-clamp-2 text-sm leading-snug font-medium transition-colors">
            {project.name}
          </h3>
          {!isSelectionMode && (
            <DropdownMenu
              open={isDropdownOpen}
              onOpenChange={setIsDropdownOpen}
            >
              <DropdownMenuTrigger asChild>
                <Button
                  aria-label="project options"
                  variant="text"
                  size="sm"
                  className={`ml-2 size-6 shrink-0 p-0 transition-all ${isDropdownOpen
                      ? "opacity-100"
                      : "opacity-0 group-hover:opacity-100"
                    }`}
                  onClick={(event) => event.preventDefault()}
                >
                  <MoreHorizontal aria-hidden="true" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                onCloseAutoFocus={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                }}
              >
                <DropdownMenuItem
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    setIsDropdownOpen(false);
                    setIsRenameDialogOpen(true);
                  }}
                >
                  Rename
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    handleDuplicateProject();
                  }}
                >
                  Duplicate
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    setIsDropdownOpen(false);
                    setIsDeleteDialogOpen(true);
                  }}
                >
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        <div className="space-y-1">
          <div className="text-muted-foreground flex items-center gap-1.5 text-sm">
            <Calendar className="size-4!" />
            <span>Created {formatDate({ date: project.createdAt })}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <>
      {isSelectionMode ? (
        <button
          type="button"
          onClick={(event) => handleCardClick({ event })}
          onKeyDown={(event) => handleCardKeyDown({ event })}
          className="group block w-full cursor-pointer text-left"
        >
          {cardContent}
        </button>
      ) : (
        <Link href={`/editor/${project.id}`} className="group block">
          {cardContent}
        </Link>
      )}
      <DeleteProjectDialog
        isOpen={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={handleDeleteProject}
      />
      <RenameProjectDialog
        isOpen={isRenameDialogOpen}
        onOpenChange={setIsRenameDialogOpen}
        onConfirm={(name) => handleRenameProject({ name })}
        projectName={project.name}
      />
    </>
  );
}

function ProjectsLoader() {
  return (
    <div className="xs:grid-cols-2 grid grid-cols-1 gap-6 sm:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: 8 }, (_, index) => (
        <div
          key={`skeleton-${index}`}
          className="bg-background overflow-hidden border-none p-0"
        >
          <Skeleton className="bg-muted/50 aspect-square w-full" />
          <div className="flex flex-col gap-1.5 px-0 pt-5">
            <Skeleton className="bg-muted/50 h-4 w-3/4" />
            <div className="flex items-center gap-1.5">
              <Skeleton className="bg-muted/50 h-4 w-4" />
              <Skeleton className="bg-muted/50 h-4 w-24" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function CreateButton({ onClick }: { onClick?: () => void }) {
  return (
    <Button className="flex" onClick={onClick}>
      <Plus className="size-4!" />
      <span className="text-sm font-medium">New project</span>
    </Button>
  );
}

function EmptyState({
  search,
  onCreateProject,
}: {
  search: { query: string; onClearSearch: () => void };
  onCreateProject: () => void;
}) {
  const editor = useEditor();
  const savedProjects = editor.project.getSavedProjects();

  if (savedProjects.length > 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-6 py-16 text-center">
        <div className="flex flex-col items-center gap-2">
          <div className="bg-muted/30 flex size-16 items-center justify-center rounded-full">
            <Search className="text-muted-foreground size-8" />
          </div>
          <h3 className="text-lg font-medium">No results found</h3>
          <p className="text-muted-foreground max-w-md">
            Your search for "{search.query}" did not return any results.
          </p>
        </div>
        <Button onClick={search.onClearSearch} variant="outline">
          Clear search
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center gap-6 py-16 text-center">
      <div className="flex flex-col items-center gap-2">
        <div className="bg-muted/30 flex size-16 items-center justify-center rounded-full">
          <Video className="text-muted-foreground size-8" />
        </div>
        <h3 className="text-lg font-medium">No projects yet</h3>
        <p className="text-muted-foreground max-w-md">
          Start creating your first video project. Import media, edit, and
          export professional videos.
        </p>
      </div>
      <Button size="lg" className="gap-2" onClick={onCreateProject}>
        <Plus />
        Create your first project
      </Button>
    </div>
  );
}
