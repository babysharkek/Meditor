import { useCallback } from "react";
import { useTimelineStore } from "@/stores/timeline-store";

type ElementRef = { trackId: string; elementId: string };

export function useElementSelection() {
  const selectedElements = useTimelineStore((s) => s.selectedElements);
  const setSelectedElements = useTimelineStore((s) => s.setSelectedElements);

  const isSelected = useCallback(
    ({ trackId, elementId }: ElementRef) =>
      selectedElements.some(
        (el) => el.trackId === trackId && el.elementId === elementId,
      ),
    [selectedElements],
  );

  const select = useCallback(
    ({ trackId, elementId }: ElementRef) => {
      setSelectedElements({ elements: [{ trackId, elementId }] });
    },
    [setSelectedElements],
  );

  const addToSelection = useCallback(
    ({ trackId, elementId }: ElementRef) => {
      const alreadySelected = selectedElements.some(
        (el) => el.trackId === trackId && el.elementId === elementId,
      );
      if (alreadySelected) return;

      setSelectedElements({
        elements: [...selectedElements, { trackId, elementId }],
      });
    },
    [selectedElements, setSelectedElements],
  );

  const removeFromSelection = useCallback(
    ({ trackId, elementId }: ElementRef) => {
      setSelectedElements({
        elements: selectedElements.filter(
          (el) => !(el.trackId === trackId && el.elementId === elementId),
        ),
      });
    },
    [selectedElements, setSelectedElements],
  );

  const toggleSelection = useCallback(
    ({ trackId, elementId }: ElementRef) => {
      const alreadySelected = selectedElements.some(
        (el) => el.trackId === trackId && el.elementId === elementId,
      );

      if (alreadySelected) {
        removeFromSelection({ trackId, elementId });
      } else {
        addToSelection({ trackId, elementId });
      }
    },
    [selectedElements, addToSelection, removeFromSelection],
  );

  const clearSelection = useCallback(() => {
    setSelectedElements({ elements: [] });
  }, [setSelectedElements]);

  const setSelection = useCallback(
    (elements: ElementRef[]) => {
      setSelectedElements({ elements });
    },
    [setSelectedElements],
  );

  /**
   * Handles click interaction on an element.
   * - Regular click: select only this element
   * - Multi-key click (Ctrl/Cmd): toggle this element in selection
   */
  const handleElementClick = useCallback(
    ({
      trackId,
      elementId,
      isMultiKey,
    }: ElementRef & { isMultiKey: boolean }) => {
      if (isMultiKey) {
        toggleSelection({ trackId, elementId });
      } else {
        select({ trackId, elementId });
      }
    },
    [toggleSelection, select],
  );

  /**
   * Ensures element is selected without toggling.
   * Used for drag operations where we want to select if not already.
   */
  const ensureSelected = useCallback(
    ({ trackId, elementId }: ElementRef) => {
      if (!isSelected({ trackId, elementId })) {
        select({ trackId, elementId });
      }
    },
    [isSelected, select],
  );

  return {
    selectedElements,
    isSelected,
    select,
    setSelection,
    addToSelection,
    removeFromSelection,
    toggleSelection,
    clearSelection,
    handleElementClick,
    ensureSelected,
  };
}
