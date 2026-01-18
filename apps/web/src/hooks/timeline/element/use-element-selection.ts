import { useCallback } from "react";
import { useTimelineStore } from "@/stores/timeline-store";

type ElementRef = { trackId: string; elementId: string };

export function useElementSelection() {
  const { selectedElements, setSelectedElements } = useTimelineStore();

  const isElementSelected = useCallback(
    ({ trackId, elementId }: ElementRef) =>
      selectedElements.some(
        (element) =>
          element.trackId === trackId && element.elementId === elementId,
      ),
    [selectedElements],
  );

  const selectElement = useCallback(
    ({ trackId, elementId }: ElementRef) => {
      setSelectedElements({ elements: [{ trackId, elementId }] });
    },
    [setSelectedElements],
  );

  const addElementToSelection = useCallback(
    ({ trackId, elementId }: ElementRef) => {
      const alreadySelected = selectedElements.some(
        (element) =>
          element.trackId === trackId && element.elementId === elementId,
      );
      if (alreadySelected) return;

      setSelectedElements({
        elements: [...selectedElements, { trackId, elementId }],
      });
    },
    [selectedElements, setSelectedElements],
  );

  const removeElementFromSelection = useCallback(
    ({ trackId, elementId }: ElementRef) => {
      setSelectedElements({
        elements: selectedElements.filter(
          (element) =>
            !(element.trackId === trackId && element.elementId === elementId),
        ),
      });
    },
    [selectedElements, setSelectedElements],
  );

  const toggleElementSelection = useCallback(
    ({ trackId, elementId }: ElementRef) => {
      const alreadySelected = selectedElements.some(
        (element) =>
          element.trackId === trackId && element.elementId === elementId,
      );

      if (alreadySelected) {
        removeElementFromSelection({ trackId, elementId });
      } else {
        addElementToSelection({ trackId, elementId });
      }
    },
    [selectedElements, addElementToSelection, removeElementFromSelection],
  );

  const clearElementSelection = useCallback(() => {
    setSelectedElements({ elements: [] });
  }, [setSelectedElements]);

  const setElementSelection = useCallback(
    ({ elements }: { elements: ElementRef[] }) => {
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
        toggleElementSelection({ trackId, elementId });
      } else {
        selectElement({ trackId, elementId });
      }
    },
    [toggleElementSelection, selectElement],
  );

  return {
    selectedElements,
    isElementSelected,
    selectElement,
    setElementSelection,
    addElementToSelection,
    removeElementFromSelection,
    toggleElementSelection,
    clearElementSelection,
    handleElementClick,
  };
}
