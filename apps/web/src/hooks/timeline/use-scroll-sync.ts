import { useEffect, useRef } from "react";

interface UseScrollSyncProps {
  rulerScrollRef: React.RefObject<HTMLDivElement>;
  tracksScrollRef: React.RefObject<HTMLDivElement>;
  trackLabelsScrollRef?: React.RefObject<HTMLDivElement>;
  bookmarksScrollRef?: React.RefObject<HTMLDivElement>;
}

export function useScrollSync({
  rulerScrollRef,
  tracksScrollRef,
  trackLabelsScrollRef,
  bookmarksScrollRef,
}: UseScrollSyncProps) {
  const isUpdatingRef = useRef(false);
  const lastRulerSync = useRef(0);
  const lastTracksSync = useRef(0);
  const lastVerticalSync = useRef(0);
  const lastBookmarksSync = useRef(0);

  useEffect(() => {
    const rulerViewport = rulerScrollRef.current;
    const tracksViewport = tracksScrollRef.current;
    const trackLabelsViewport = trackLabelsScrollRef?.current;
    const bookmarksViewport = bookmarksScrollRef?.current;
    let handleBookmarksScroll: (() => void) | null = null;

    if (!rulerViewport || !tracksViewport) return;

    const handleRulerScroll = () => {
      const now = Date.now();
      if (isUpdatingRef.current || now - lastRulerSync.current < 16) return;
      lastRulerSync.current = now;
      isUpdatingRef.current = true;
      tracksViewport.scrollLeft = rulerViewport.scrollLeft;
      if (bookmarksViewport) {
        bookmarksViewport.scrollLeft = rulerViewport.scrollLeft;
      }
      isUpdatingRef.current = false;
    };

    const handleTracksScroll = () => {
      const now = Date.now();
      if (isUpdatingRef.current || now - lastTracksSync.current < 16) return;
      lastTracksSync.current = now;
      isUpdatingRef.current = true;
      rulerViewport.scrollLeft = tracksViewport.scrollLeft;
      if (bookmarksViewport) {
        bookmarksViewport.scrollLeft = tracksViewport.scrollLeft;
      }
      isUpdatingRef.current = false;
    };

    rulerViewport.addEventListener("scroll", handleRulerScroll);
    tracksViewport.addEventListener("scroll", handleTracksScroll);

    if (bookmarksViewport) {
      handleBookmarksScroll = () => {
        const now = Date.now();
        if (isUpdatingRef.current || now - lastBookmarksSync.current < 16)
          return;
        lastBookmarksSync.current = now;
        isUpdatingRef.current = true;
        tracksViewport.scrollLeft = bookmarksViewport.scrollLeft;
        rulerViewport.scrollLeft = bookmarksViewport.scrollLeft;
        isUpdatingRef.current = false;
      };

      bookmarksViewport.addEventListener("scroll", handleBookmarksScroll);
    }

    if (trackLabelsViewport) {
      const handleTrackLabelsScroll = () => {
        const now = Date.now();
        if (isUpdatingRef.current || now - lastVerticalSync.current < 16)
          return;
        lastVerticalSync.current = now;
        isUpdatingRef.current = true;
        tracksViewport.scrollTop = trackLabelsViewport.scrollTop;
        isUpdatingRef.current = false;
      };

      const handleTracksVerticalScroll = () => {
        const now = Date.now();
        if (isUpdatingRef.current || now - lastVerticalSync.current < 16)
          return;
        lastVerticalSync.current = now;
        isUpdatingRef.current = true;
        trackLabelsViewport.scrollTop = tracksViewport.scrollTop;
        isUpdatingRef.current = false;
      };

      trackLabelsViewport.addEventListener("scroll", handleTrackLabelsScroll);
      tracksViewport.addEventListener("scroll", handleTracksVerticalScroll);

      return () => {
        rulerViewport.removeEventListener("scroll", handleRulerScroll);
        tracksViewport.removeEventListener("scroll", handleTracksScroll);
        if (bookmarksViewport && handleBookmarksScroll) {
          bookmarksViewport.removeEventListener(
            "scroll",
            handleBookmarksScroll,
          );
        }
        trackLabelsViewport.removeEventListener(
          "scroll",
          handleTrackLabelsScroll,
        );
        tracksViewport.removeEventListener(
          "scroll",
          handleTracksVerticalScroll,
        );
      };
    }

    return () => {
      rulerViewport.removeEventListener("scroll", handleRulerScroll);
      tracksViewport.removeEventListener("scroll", handleTracksScroll);
      if (bookmarksViewport && handleBookmarksScroll) {
        bookmarksViewport.removeEventListener("scroll", handleBookmarksScroll);
      }
    };
  }, [
    rulerScrollRef,
    tracksScrollRef,
    trackLabelsScrollRef,
    bookmarksScrollRef,
  ]);
}
