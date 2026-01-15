import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useEditor } from "@/hooks/use-editor";

export function useProjectInitialize({ projectId }: { projectId: string }) {
  const router = useRouter();
  const handledProjectIds = useRef<Set<string>>(new Set());
  const isInitializingRef = useRef<boolean>(false);
  const editor = useEditor();
  const activeProject = editor.project.getActive();

  useEffect(() => {
    let isCancelled = false;

    const initProject = async () => {
      if (!projectId) {
        return;
      }

      if (isInitializingRef.current) {
        return;
      }

      if (activeProject?.metadata.id === projectId) {
        return;
      }

      if (editor.project.isInvalidProjectId({ id: projectId })) {
        return;
      }

      if (handledProjectIds.current.has(projectId)) {
        return;
      }

      isInitializingRef.current = true;
      handledProjectIds.current.add(projectId);

      try {
        await editor.project.loadProject({ id: projectId });

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
          editor.project.markProjectIdAsInvalid({ id: projectId });

          try {
            const newProjectId = await editor.project.createNewProject({
              name: "Untitled Project",
            });

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
  }, [projectId, editor, router]);
}
