import { useEffect } from "react";

// A camera left running while the tab/window is backgrounded keeps the
// browser's recording indicator lit and the sensor active for no reason —
// stop it whenever the page isn't visible, whatever screen/step turned it
// on. Doesn't restart on return; the capture screens already have their own
// "Retry/Retake camera" button for that, so this can't silently turn the
// camera back on without the user noticing.
export function useStopCameraWhenHidden(stopCamera) {
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) stopCamera();
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [stopCamera]);
}
