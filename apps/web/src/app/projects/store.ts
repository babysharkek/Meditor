import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { TProjectSortKey } from "@/types/project";

export type ProjectsViewMode = "grid" | "list";

interface ProjectsState {
	searchQuery: string;
	sortKey: TProjectSortKey;
	sortOrder: "asc" | "desc";
	viewMode: ProjectsViewMode;
	selectedProjectIds: string[];
	isHydrated: boolean;
	setIsHydrated: ({ isHydrated }: { isHydrated: boolean }) => void;
	setSearchQuery: ({ query }: { query: string }) => void;
	setSortKey: ({ sortKey }: { sortKey: TProjectSortKey }) => void;
	setSortOrder: ({ sortOrder }: { sortOrder: "asc" | "desc" }) => void;
	toggleSortOrder: () => void;
	setViewMode: ({ viewMode }: { viewMode: ProjectsViewMode }) => void;
	setSelectedProjects: ({ projectIds }: { projectIds: string[] }) => void;
	clearSelectedProjects: () => void;
	setProjectSelected: ({
		projectId,
		isSelected,
	}: {
		projectId: string;
		isSelected: boolean;
	}) => void;
}

const getNextSelectedProjectIds = ({
	selectedProjectIds,
	projectId,
	isSelected,
}: {
	selectedProjectIds: string[];
	projectId: string;
	isSelected: boolean;
}): string[] => {
	const selectedProjectIdSet = new Set(selectedProjectIds);

	if (isSelected) {
		selectedProjectIdSet.add(projectId);
		return Array.from(selectedProjectIdSet);
	}

	selectedProjectIdSet.delete(projectId);
	return Array.from(selectedProjectIdSet);
};

export const useProjectsStore = create<ProjectsState>()(
	persist(
		(set) => ({
			searchQuery: "",
			sortKey: "createdAt",
			sortOrder: "desc",
			viewMode: "grid",
			selectedProjectIds: [],
			isHydrated: false,
			setIsHydrated: ({ isHydrated }) => set({ isHydrated }),
			setSearchQuery: ({ query }) => set({ searchQuery: query }),
			setSortKey: ({ sortKey }) => set({ sortKey }),
			setSortOrder: ({ sortOrder }) => set({ sortOrder }),
			toggleSortOrder: () =>
				set((state) => ({
					sortOrder: state.sortOrder === "asc" ? "desc" : "asc",
				})),
			setViewMode: ({ viewMode }) => set({ viewMode }),
			setSelectedProjects: ({ projectIds }) =>
				set({ selectedProjectIds: projectIds }),
			clearSelectedProjects: () => set({ selectedProjectIds: [] }),
			setProjectSelected: ({ projectId, isSelected }) =>
				set((state) => ({
					selectedProjectIds: getNextSelectedProjectIds({
						selectedProjectIds: state.selectedProjectIds,
						projectId,
						isSelected,
					}),
				})),
		}),
		{
			name: "projects-view-mode",
			partialize: (state) => ({ viewMode: state.viewMode }),
			onRehydrateStorage: () => (state) => {
				state?.setIsHydrated({ isHydrated: true });
			},
		},
	),
);
