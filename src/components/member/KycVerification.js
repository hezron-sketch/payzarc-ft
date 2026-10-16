import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronLeft, IdCard, ScanFace, Check, RotateCcw, CircleCheck, LoaderCircle } from "lucide-react";
import axiosInstance from '../../utility/axiosInstance';
import { useStopCameraWhenHidden } from '../../utility/useStopCameraWhenHidden';
import { cn } from '@/lib/utils';

// Same flow-card recipe as ProfileImageCapture.js/PaymentMethods.js — kept
// as its own copy of the strings rather than a shared import, matching how
// every other flow page in this app carries its own class constants.
const flowCardClass =
  "relative p-8 w-full max-w-[440px] mx-auto min-h-[560px] flex flex-col gap-6 bg-[radial-gradient(circle_at_30%_0%,var(--card),var(--card2)_65%)] rounded-2xl shadow-[0_30px_70px_rgba(0,0,0,0.45),0_0_0_1px_rgba(255,255,255,0.04)_inset] animate-modal-3d-in max-[480px]:p-6 max-[480px]:px-5 max-[480px]:min-h-[480px]";
const flowHeaderClass =
  "absolute left-0 w-full bottom-full mb-3 grid grid-cols-[1fr_auto_1fr] items-center text-white";
const backBtnClass =
  "col-start-1 justify-self-start inline-flex items-center gap-1 px-1 py-1 bg-transparent border-none text-white text-[0.9rem] font-semibold cursor-pointer transition-opacity duration-200 hover:opacity-75";
const primaryBtnClass =
  "w-full h-auto rounded-sm px-5 py-2.5 text-base font-bold text-black transition-ui duration-200 hover:bg-gold-dark active:scale-[0.97] disabled:opacity-60 disabled:active:scale-100 shadow-lg shadow-gold/10 hover:shadow-gold/20 bg-gold flex items-center justify-center gap-2 cursor-pointer border-none disabled:cursor-not-allowed";
const ghostBtnClass =
  "w-full rounded-sm px-5 py-2.5 text-base font-semibold text-foreground bg-white/[0.03] border border-white/[0.08] transition-ui duration-200 hover:bg-white/[0.06] hover:border-gold/20 active:scale-[0.97] flex items-center justify-center gap-2 cursor-pointer";

// Two fixed steps — a document shot, then a selfie — each using the same
// capture mechanic, so this stays one small state machine instead of a
// generic N-step camera framework nobody else needs yet.
const STEPS = [
  {
    key: "document",
    title: "Scan your ID",
    hint: "Fit the front of your ID card inside the frame.",
    icon: IdCard,
    aspect: "aspect-[16/10]",
  },
  {
    key: "selfie",
    title: "Take a selfie",
    hint: "Face the camera in good light.",
    icon: ScanFace,
    aspect: "aspect-[3/4]",
  },
];

function KycVerification({ onRefreshUser, onBack }) {
  const [stepIndex, setStepIndex] = useState(0);
  const [shots, setShots] = useState({ document: null, selfie: null });
  const [cameraError, setCameraError] = useState('');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [flash, setFlash] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [success, setSuccess] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const step = STEPS[stepIndex];
  const currentShot = shots[step.key];

  const stopCamera = useCallback(() => {
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  }, []);

  useStopCameraWhenHidden(stopCamera);

  const startCamera = useCallback(async () => {
    stopCamera();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setIsCameraActive(true);
      setCameraError('');
    } catch (err) {
      setCameraError('Camera access denied. Please allow permission and refresh.');
      setIsCameraActive(false);
    }
  }, [stopCamera]);

  useEffect(() => {
    if (!currentShot) startCamera();
    else stopCamera();
    return stopCamera;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepIndex]);

  const capture = () => {
    if (!videoRef.current || !canvasRef.current || !isCameraActive) return;
    setFlash(true);
    setTimeout(() => setFlash(false), 350);
    const canvas = canvasRef.current;
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext('2d').drawImage(videoRef.current, 0, 0);
    setShots((s) => ({ ...s, [step.key]: canvas.toDataURL('image/png') }));
    stopCamera();
  };

  const retake = () => {
    setShots((s) => ({ ...s, [step.key]: null }));
    startCamera();
  };

  const goNext = () => {
    if (stepIndex < STEPS.length - 1) {
      setStepIndex((i) => i + 1);
    } else {
      submit();
    }
  };

  const submit = async () => {
    setSubmitError('');
    setSubmitting(true);
    try {
      const res = await axiosInstance.post('/api/kyc/verify', {});
      if (res.data) {
        onRefreshUser?.();
        setSuccess(true);
        setTimeout(onBack, 1800);
      }
    } catch (err) {
      setSubmitError('Verification failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="flex justify-center items-center p-4 box-border">
        <div className={cn(flowCardClass, "items-center justify-center text-center")}>
          <CircleCheck size={64} className="text-success animate-flow-fade-in" />
          <h2 className="text-[1.6rem] font-bold text-foreground m-0">Identity verified!</h2>
          <p className="text-[var(--muted)] text-sm">
            Your account is now fully verified. Taking you back…
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-center items-center p-4 box-border">
      {/* ponytail: same one-off pulse trick ProfileImageCapture.js uses for
          its face guide — not worth a global tailwind.config.js entry. */}
      <style>{`
        @keyframes kycGuidePulse {
          0% { opacity: 0.7; }
          50% { opacity: 1; }
          100% { opacity: 0.7; }
        }
      `}</style>
      <div className={flowCardClass}>
        <div className={flowHeaderClass}>
          <button onClick={onBack} className={backBtnClass}>
            <ChevronLeft size={18} /> Back
          </button>
        </div>

        <div className="flex items-center justify-center gap-2 -mb-1">
          {STEPS.map((s, i) => (
            <span
              key={s.key}
              className={cn(
                "h-1.5 rounded-full transition-[width,background-color] duration-300 ease-apple",
                i === stepIndex ? "w-8 bg-gold" : i < stepIndex ? "w-4 bg-gold/50" : "w-4 bg-white/[0.1]",
              )}
            />
          ))}
        </div>

        <h2 className="text-[1.6rem] font-bold text-foreground text-center m-0">
          {step.title}
        </h2>
        <p className="text-[var(--muted)] text-sm text-center -mt-4">{step.hint}</p>

        <div className="w-full flex-1 flex flex-col items-center justify-center gap-5">
          {!currentShot ? (
            <>
              {cameraError ? (
                <div className="w-full text-center p-5 bg-destructive/10 border border-destructive/20 rounded-xl">
                  <p className="text-destructive text-sm mb-3">{cameraError}</p>
                  <button onClick={startCamera} className={ghostBtnClass}>
                    Retry camera
                  </button>
                </div>
              ) : (
                <div className={cn("relative w-full rounded-xl overflow-hidden ring-1 ring-white/[0.06] bg-black/40", step.aspect)}>
                  <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover block" />
                  <div
                    className="absolute inset-3 rounded-lg border-2 border-dashed border-gold/70 pointer-events-none"
                    style={{ animation: 'kycGuidePulse 2.5s infinite ease-in-out' }}
                  />
                  <div
                    className={cn(
                      "absolute inset-0 bg-white pointer-events-none transition-opacity duration-300",
                      flash ? "opacity-80" : "opacity-0",
                    )}
                  />
                </div>
              )}

              <button
                onClick={capture}
                disabled={!isCameraActive || !!cameraError}
                className={primaryBtnClass}
              >
                <step.icon size={18} /> Capture
              </button>
            </>
          ) : (
            <>
              <div className={cn("relative w-full rounded-xl overflow-hidden ring-2 ring-gold/30 animate-flow-fade-in", step.aspect)}>
                <img src={currentShot} alt={step.title} className="w-full h-full object-cover block" />
              </div>
              <div className="flex flex-col gap-3 w-full">
                {submitError && (
                  <p className="text-xs text-red-400 text-center -mb-1">{submitError}</p>
                )}
                <button onClick={goNext} disabled={submitting} className={primaryBtnClass}>
                  {submitting ? (
                    <>
                      <LoaderCircle size={18} className="animate-spin" /> Verifying…
                    </>
                  ) : (
                    <>
                      <Check size={18} />
                      {stepIndex < STEPS.length - 1 ? "Use this photo" : "Submit for verification"}
                    </>
                  )}
                </button>
                <button onClick={retake} disabled={submitting} className={ghostBtnClass}>
                  <RotateCcw size={16} /> Retake
                </button>
              </div>
            </>
          )}
        </div>

        <canvas ref={canvasRef} style={{ display: 'none' }} />
      </div>
    </div>
  );
}

export default KycVerification;
