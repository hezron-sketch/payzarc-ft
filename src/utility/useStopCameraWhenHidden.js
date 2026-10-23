import { useEffect } from "react";

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
