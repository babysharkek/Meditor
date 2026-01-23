"use client";

import {
	ArrowDown,
	Clock3,
	Folder,
	LayoutGrid,
	List,
	MoreHorizontal,
	Plus,
	Search,
} from "lucide-react";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";

const projects = [
	{
		id: "project-1",
		name: "Summer Vlog 2025",
		createdAtLabel: "Created Jan 20, 2026",
		duration: "02:14",
	},
	{
		id: "project-2",
		name: "Product Launch Teaser",
		createdAtLabel: "Created Jan 20, 2026",
		duration: "00:45",
	},
	{
		id: "project-3",
		name: "Podcast Ep. 4",
		createdAtLabel: "Created Jan 18, 2026",
		duration: "03:30",
	},
];

const thumbnailSrc = "/open-graph/default.jpg";

export default function ProjectsPage() {
	const [selectedProjectIds, setSelectedProjectIds] = useState<Array<string>>(
		[],
	);
	const selectAllRef = useRef<HTMLInputElement | null>(null);

	const selectedProjectIdSet = useMemo(() => {
		return new Set(selectedProjectIds);
	}, [selectedProjectIds]);

	const selectedCount = selectedProjectIds.length;
	const totalCount = projects.length;
	const isAllSelected = selectedCount > 0 && selectedCount === totalCount;
	const isIndeterminate = selectedCount > 0 && selectedCount < totalCount;

	useEffect(() => {
		if (!selectAllRef.current) {
			return;
		}
		selectAllRef.current.indeterminate = isIndeterminate;
	}, [isIndeterminate]);

	const toggleProjectSelection = ({
		projectId,
		isSelected,
	}: {
		projectId: string;
		isSelected: boolean;
	}) => {
		setSelectedProjectIds((previousIds) => {
			if (isSelected) {
				if (previousIds.includes(projectId)) {
					return previousIds;
				}
				return [...previousIds, projectId];
			}
			return previousIds.filter((id) => id !== projectId);
		});
	};

	const toggleSelectAll = ({ isSelected }: { isSelected: boolean }) => {
		if (!isSelected) {
			setSelectedProjectIds([]);
			return;
		}
		setSelectedProjectIds(projects.map(({ id }) => id));
	};

	return (
		<div
			className={`flex h-screen overflow-hidden bg-[#ffffff] text-slate-900 ${
				selectedCount > 1 ? "multi-select" : ""
			}`}
			style={{ "--brand-blue": "#00A3FF" } as React.CSSProperties}
		>
			<aside className="flex w-64 flex-shrink-0 flex-col border-r border-slate-100 bg-white">
				<div className="flex items-center gap-3 p-6 pl-8">
					<Image
						src="/logos/opencut/1k/logo-black.png"
						alt="OpenCut Logo"
						width={24}
						height={24}
						className="size-6"
					/>
					<span className="text-lg font-semibold tracking-tight text-slate-900">
						OpenCut
					</span>
				</div>

				<nav className="mt-2 flex-1 space-y-2 px-4">
					<a
						href="/projects"
						className="flex items-center gap-3 rounded-2xl bg-blue-50/50 px-4 py-3 text-sm font-medium text-[#00A3FF]"
					>
						<LayoutGrid className="h-5 w-5" />
						Projects
					</a>
					<div className="px-4 pt-6 pb-2">
						<p className="text-xs font-bold tracking-wider text-slate-400 uppercase">
							Folders
						</p>
					</div>
					<a
						href="/projects"
						className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-900"
					>
						<Folder className="h-5 w-5 text-slate-400" />
						Marketing
					</a>
					<a
						href="/projects"
						className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-900"
					>
						<Folder className="h-5 w-5 text-slate-400" />
						Social media
					</a>
				</nav>
			</aside>

			<main className="flex min-w-0 flex-1 flex-col">
				<header className="flex h-20 flex-shrink-0 items-center justify-between px-8">
					<div className="flex items-center gap-4">
						<h1 className="text-xl font-bold text-slate-900">All projects</h1>
					</div>

					<div className="flex items-center gap-4">
						<div className="group relative">
							<Search className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
							<input
								type="text"
								placeholder="Search..."
								className="w-64 rounded-full border border-slate-200 bg-white py-2.5 pr-4 pl-10 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#00A3FF] focus:ring-4 focus:ring-blue-500/10 focus:outline-none"
							/>
						</div>

						<div className="flex rounded-full border border-slate-200 bg-white p-1">
							<button
								type="button"
								className="rounded-full bg-slate-100 p-2 text-slate-900"
								aria-label="Grid view"
							>
								<LayoutGrid className="h-4 w-4" aria-hidden="true">
									<title>Grid view</title>
								</LayoutGrid>
							</button>
							<button
								type="button"
								className="rounded-full p-2 text-slate-400 hover:text-slate-600"
								aria-label="List view"
							>
								<List className="h-4 w-4" aria-hidden="true">
									<title>List view</title>
								</List>
							</button>
						</div>

						<button
							type="button"
							className="flex items-center gap-2 rounded-full bg-[#00A3FF] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#008BE0] active:scale-95"
						>
							<Plus className="h-4 w-4" />
							New project
						</button>
					</div>
				</header>

				<div className="flex-1 overflow-y-auto px-8 pb-8">
					<div
						id="controls-row"
						className="controls-row group mb-4 flex items-center gap-3 text-slate-700"
					>
						<div className="flex items-center gap-2">
							<label className="flex cursor-pointer items-center gap-3 rounded-lg p-1 text-sm font-medium select-none">
								<input
									ref={selectAllRef}
									id="select-all"
									type="checkbox"
									className="custom-checkbox controls-select size-5"
									checked={isAllSelected}
									onChange={({ currentTarget }) => {
										toggleSelectAll({ isSelected: currentTarget.checked });
									}}
								/>
								<span className="text-slate-500 group-hover:text-slate-700">
									Select all
								</span>
							</label>
						</div>
						<div className="mx-2 h-4 w-px bg-slate-200"></div>
						<button
							type="button"
							className="inline-flex items-center gap-1.5 rounded-lg p-1 text-sm font-medium text-slate-500 hover:text-slate-900"
						>
							Name
							<ArrowDown className="size-3.5" />
						</button>
					</div>

					<div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
						{projects.map(({ createdAtLabel, duration, id, name }) => {
							const isSelected = selectedProjectIdSet.has(id);
							return (
								<div
									key={id}
									className="project-card group relative flex h-auto flex-col overflow-hidden rounded-[24px]"
									data-project-id={id}
								>
									<div className="project-select-wrapper absolute top-4 left-4 z-20">
										<input
											type="checkbox"
											className="custom-checkbox project-select h-6 w-6 cursor-pointer shadow-md"
											checked={isSelected}
											onChange={({ currentTarget }) => {
												toggleProjectSelection({
													projectId: id,
													isSelected: currentTarget.checked,
												});
											}}
										/>
									</div>

									<div className="project-menu absolute top-4 right-4 z-20 opacity-0 group-hover:opacity-100">
										<button
											type="button"
											className="rounded-full bg-white/90 p-2 text-slate-600 backdrop-blur-sm hover:bg-white hover:text-[#00A3FF]"
											aria-label="Project menu"
										>
											<MoreHorizontal className="h-4 w-4" aria-hidden="true">
												<title>Project menu</title>
											</MoreHorizontal>
										</button>
									</div>

									<div className="relative m-1 aspect-video overflow-hidden rounded-lg bg-slate-50">
										<Image
											src={thumbnailSrc}
											alt={`Thumbnail for ${name}`}
											fill
											sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
											className="object-cover"
										/>
										<div className="absolute right-2 bottom-2 rounded-lg bg-black/60 px-2 py-1 text-[11px] font-semibold text-white">
											{duration}
										</div>
									</div>

									<div className="flex flex-1 flex-col justify-between px-2 pt-3 pb-5">
										<div>
											<h3 className="truncate text-[15px] font-semibold text-slate-900">
												{name}
											</h3>
											<div className="mt-2 flex items-center gap-2 text-slate-400">
												<Clock3 className="size-4" aria-hidden="true" />
												<p className="text-xs font-medium">{createdAtLabel}</p>
											</div>
										</div>
									</div>
								</div>
							);
						})}
					</div>
				</div>
			</main>

			<style jsx global>{`
        .project-card:hover .card-actions {
          opacity: 1;
        }
        .checkbox-wrapper:checked + div {
          border-color: var(--brand-blue);
          background-color: #eff6ff;
        }
        .controls-row.has-selection .controls-select {
          opacity: 1;
        }
        .project-select-wrapper {
          opacity: 0;
        }
        .project-card:hover .project-select-wrapper {
          opacity: 1;
        }
        .project-card:has(.project-select:checked) .project-select-wrapper {
          opacity: 1;
        }
        .multi-select .project-menu {
          opacity: 0 !important;
          pointer-events: none;
        }
        .custom-checkbox {
          appearance: none;
          background-color: #fff;
          border: 2px solid #e2e8f0;
          border-radius: 8px;
          display: inline-grid;
          place-content: center;
        }
        .custom-checkbox:checked {
          background-color: var(--brand-blue);
          border-color: var(--brand-blue);
        }
        .custom-checkbox:checked::after {
          content: "";
          width: 10px;
          height: 10px;
          background-color: #fff;
          clip-path: polygon(
            14% 44%,
            0 58%,
            40% 100%,
            100% 24%,
            86% 10%,
            40% 70%
          );
        }
      `}</style>
		</div>
	);
}
