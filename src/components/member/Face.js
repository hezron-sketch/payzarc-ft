import React, { useCallback, useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useStopCameraWhenHidden } from "../../utility/useStopCameraWhenHidden";
import {
  cameraErrorMessage,
  useRetryWhenCameraAllowed,
} from "../../utility/cameraError";
import { pickerDialogClass, primaryBtnClass } from "./shared";

const FACE_API_URL = `${
  process.env.REACT_APP_FACE_SERVICE_URL || "http://127.0.0.1:8087"
}/api/face`;

// The face service isn't consistent about booleans (true / 1 / "true").
const truthy = (v) => v === true || v === 1 || v === "1" || v === "true";
const falsy = (v) => v === false || v === 0 || v === "0" || v === "false";

const reasonOf = (data, fallback) =>
  data?.message || data?.detail || data?.error || fallback;

const postFace = async (path, email, image) => {
  const res = await fetch(`${FACE_API_URL}/${path}/`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ email, images: [image] }),
  });
  return { res, data: await res.json().catch(() => ({})) };
};

function Face({ open, email, onSuccess, onClose }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  // "checking" | "enroll" | "verify" | "processing" | "success" | "error"
  const [mode, setMode] = useState("checking");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState(null);
  // Bumped by "Try again" to rerun the whole flow from the status check.
  const [attempt, setAttempt] = useState(0);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);
  useStopCameraWhenHidden(stopCamera);
  useRetryWhenCameraAllowed(mode === "error", () => setAttempt((a) => a + 1));

  const normalizedEmail = (email || "").trim().toLowerCase();

  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;
    let timer;
    const sleep = (ms) =>
      new Promise((resolve) => {
        timer = setTimeout(resolve, ms);
      });
    const fail = (msg, detail = "") => {
      if (cancelled) return;
      stopCamera();
      setCountdown(null);
      setMode("error");
      setMessage(msg);
      setError(detail);
    };

    const run = async () => {
      setError("");
      setCountdown(null);
      setMode("checking");
      setMessage("Checking face enrollment...");
      if (!normalizedEmail) {
        fail(
          "Face authentication unavailable.",
          "Your account email could not be retrieved.",
        );
        return;
      }

      let status = {};
      try {
        const res = await fetch(
          `${FACE_API_URL}/status/?email=${encodeURIComponent(normalizedEmail)}`,
          { headers: { Accept: "application/json" } },
        );
        if (res.ok) status = await res.json().catch(() => ({}));
      } catch {
        // service unreachable — enrollment attempt below will surface it
      }
      if (cancelled) return;
      if (truthy(status.enrolled) && falsy(status.enabled)) {
        fail(
          "Face verification is disabled.",
          "Face verification is disabled for this account. Use your PIN instead.",
        );
        return;
      }
      let current = truthy(status.enrolled) ? "verify" : "enroll";

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "user",
            width: { ideal: 640 },
            height: { ideal: 480 },
          },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      } catch (err) {
        fail(
          "Camera access is required.",
          cameraErrorMessage(err),
        );
        return;
      }

      // Loops at most once: enroll → 409 "already enrolled" → verify.
      for (;;) {
        if (cancelled) return;
        setMode(current);
        setMessage(
          current === "enroll"
            ? "No face is registered yet — keep your face inside the circle to enroll it."
            : "Keep your face inside the circle to verify it's you.",
        );
        await sleep(1200);
        for (let n = 3; n >= 1; n--) {
          if (cancelled) return;
          setCountdown(n);
          await sleep(1000);
        }
        if (cancelled) return;
        setCountdown(null);

        const video = videoRef.current;
        if (!streamRef.current || !video?.videoWidth) {
          fail(
            "Unable to capture your face.",
            "Make sure your face is visible and try again.",
          );
          return;
        }
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext("2d").drawImage(video, 0, 0);
        const image = canvas.toDataURL("image/jpeg", 0.92);

        setMode("processing");
        setMessage(
          current === "enroll"
            ? "Registering your face..."
            : "Verifying your face...",
        );
        let res;
        let data;
        try {
          ({ res, data } = await postFace(current, normalizedEmail, image));
        } catch {
          fail(
            "Face service unreachable.",
            "Check your connection and try again, or use your PIN.",
          );
          return;
        }
        if (cancelled) return;

        if (current === "enroll" && res.status === 409) {
          const msg = reasonOf(data, "").toLowerCase();
          if (
            data?.duplicate === true ||
            /already in use|another account|duplicate/.test(msg)
          ) {
            fail(
              "Face already in use.",
              "This face is already registered to another account.",
            );
            return;
          }
          current = "verify";
          continue;
        }
        const ok =
          current === "enroll"
            ? res.ok && data.success !== false && data.enrolled !== false
            : res.ok && data.success === true && data.verified === true;
        if (!ok) {
          fail(
            current === "enroll"
              ? "Face enrollment failed."
              : "Face verification failed.",
            reasonOf(data, "Try again, or use your PIN instead."),
          );
          return;
        }

        stopCamera();
        setMode("success");
        setMessage(
          current === "enroll"
            ? "Face enrolled successfully."
            : "Face verified successfully.",
        );
        await sleep(600);
        if (!cancelled) onSuccess(image);
        return;
      }
    };

    run();
    return () => {
      cancelled = true;
      clearTimeout(timer);
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, attempt, normalizedEmail, stopCamera]);

  const busy = mode === "processing" || mode === "success";
  const scanning = mode === "enroll" || mode === "verify";

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent
        className={cn(pickerDialogClass, "items-center text-center")}
      >
        <DialogTitle className="text-[1.1rem] font-bold text-foreground m-0">
          Face Authentication
        </DialogTitle>
        <p className="text-xs text-muted-foreground m-0 min-h-[2.5em]">
          {message}
        </p>

        <div className="relative w-full aspect-[4/3] rounded-xl overflow-hidden bg-black">
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-cover -scale-x-100"
          />
          {scanning && (
            <div className="absolute inset-[12%] rounded-full border-[3px] border-gold/80 pointer-events-none" />
          )}
          {countdown !== null && (
            <div className="absolute inset-0 flex items-center justify-center text-6xl font-bold text-white [text-shadow:0_2px_10px_rgba(0,0,0,0.8)] pointer-events-none">
              {countdown}
            </div>
          )}
          {(mode === "processing" || mode === "checking") && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/45 text-white font-semibold">
              Please wait...
            </div>
          )}
          {mode === "success" && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/45 text-gold text-xl font-bold">
              ✓ Success
            </div>
          )}
        </div>

        {error && (
          <p className="w-full text-[0.8rem] text-red-400 bg-red-500/10 rounded-lg px-3 py-2 m-0">
            {error}
          </p>
        )}

        {mode === "error" && (
          <Button
            className={primaryBtnClass}
            onClick={() => setAttempt((a) => a + 1)}
          >
            Try again
          </Button>
        )}
        <Button
          variant="ghost"
          className="w-full text-muted-foreground"
          disabled={busy}
          onClick={onClose}
        >
          Cancel
        </Button>
      </DialogContent>
    </Dialog>
  );
}

export function useFaceAuth(email) {
  const [resolve, setResolve] = useState(null);
  const requestFace = useCallback(
    () => new Promise((r) => setResolve(() => r)),
    [],
  );
  const finish = (image) => {
    resolve?.(image);
    setResolve(null);
  };
  const faceModal = (
    <Face
      open={!!resolve}
      email={email}
      onSuccess={finish}
      onClose={() => finish(null)}
    />
  );
  return [requestFace, faceModal];
}

export default Face;
