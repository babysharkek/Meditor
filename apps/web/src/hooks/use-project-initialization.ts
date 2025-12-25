import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useProjectStore } from "@/stores/project-store";

export function useProjectInitialization({ projectId }: { projectId: string }) {
  const {
    activeProject,
    loadProject,
    createNewProject,
    isInvalidProjectId,
    markProjectIdAsInvalid,
  } = useProjectStore();
  const router = useRouter();
  const handledProjectIds = useRef<Set<string>>(new Set());
  const isInitializingRef = useRef<boolean>(false);

  useEffect(() => {
    let isCancelled = false;

    const initProject = async () => {
      if (!projectId) {
        return;
      }

      if (isInitializingRef.current) {
        return;
      }

      if (activeProject?.id === projectId) {
        return;
      }

      if (isInvalidProjectId(projectId)) {
        return;
      }

      if (handledProjectIds.current.has(projectId)) {
        return;
      }

      isInitializingRef.current = true;
      handledProjectIds.current.add(projectId);

      try {
        await loadProject(projectId);

        if (isCancelled) {
          return;
        }

        isInitializingRef.current = false;
      } catch (error) {
        if (isCancelled) {
          return;
        }

        const isProjectNotFound =
          error instanceof Error &&
          (error.message.includes("not found") ||
            error.message.includes("does not exist") ||
            error.message.includes("Project not found"));

        if (isProjectNotFound) {
          markProjectIdAsInvalid(projectId);

          try {
            const newProjectId = await createNewProject("Untitled Project");

            if (isCancelled) {
              return;
            }

            router.replace(`/editor/${newProjectId}`);
          } catch (createError) {
            console.error("Failed to create new project:", createError);
          }
        } else {
          console.error(
            "Project loading failed with recoverable error:",
            error,
          );
          handledProjectIds.current.delete(projectId);
        }

        isInitializingRef.current = false;
      }
    };

    initProject();

    return () => {
      isCancelled = true;
      isInitializingRef.current = false;
    };
  }, [
    projectId,
    loadProject,
    createNewProject,
    router,
    isInvalidProjectId,
    markProjectIdAsInvalid,
  ]);
}
