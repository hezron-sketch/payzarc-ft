import { useEffect, useRef } from "react";

const allowSteps = () => {
  const ua = navigator.userAgent;
  if (window.Capacitor?.isNativePlatform?.())
    return "Open your phone's Settings → Apps → Payzarc → Permissions → Camera → Allow, then come back and try again.";
  if (/iPhone|iPad|iPod/i.test(ua))
    return "Open Settings → Safari → Camera → Allow (or tap \"aA\" in the address bar → Website Settings → Camera → Allow), then reload this page.";
  if (/Android/i.test(ua))
    return "Tap the lock icon next to the address bar → Permissions → Camera → Allow. The camera will start by itself.";
  return "Click the camera or lock icon in the address bar and set Camera to Allow. The camera will start by itself.";
};

export const cameraUnsupported = () => !navigator.mediaDevices?.getUserMedia;

export const cameraErrorMessage = (err) => {
  if (cameraUnsupported())
    return window.isSecureContext === false
      ? "The camera only works over a secure (https) connection."
      : "This browser can't use the camera. Try the latest Chrome or Safari.";
  switch (err?.name) {
    case "NotAllowedError":
    case "PermissionDeniedError":
    case "SecurityError":
      return `Camera access is turned off for Payzarc. ${allowSteps()}`;
    case "NotFoundError":
    case "DevicesNotFoundError":
    case "OverconstrainedError":
      return "No camera was found. Connect or turn on your camera, then try again.";
    case "NotReadableError":
    case "TrackStartError":
    case "AbortError":
      return "Your camera is being used by another app. Close any video calls or camera apps, then try again.";
    default:
      return "We couldn't start your camera. Make sure it's turned on and allowed for Payzarc, then try again.";
  }
};

export function useRetryWhenCameraAllowed(active, retry) {
  const retryRef = useRef(retry);
  retryRef.current = retry;
  useEffect(() => {
    if (!active || !navigator.permissions?.query) return undefined;
    let status;
    let gone = false;
    const onChange = () => status.state === "granted" && retryRef.current();
    navigator.permissions
      .query({ name: "camera" })
      .then((s) => {
        if (gone) return;
        status = s;
        s.addEventListener("change", onChange);
      })
      .catch(() => {});
    return () => {
      gone = true;
      status?.removeEventListener("change", onChange);
    };
  }, [active]);
}
