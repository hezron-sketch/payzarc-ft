import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, Camera, RotateCcw, Check, CheckCircle2, Loader2 } from 'lucide-react';
import axiosInstance from '../../utility/axiosInstance';
import { useStopCameraWhenHidden } from '../../utility/useStopCameraWhenHidden';
import { cn } from '@/lib/utils';

// Same flow-card/back-button/button recipe as PaymentMethods.js and Home.js
// (translucent white/[0.0X] surfaces, rounded-xl/2xl, gold-500 CTAs, the
// tip-up modal-3d entrance) so this page reads as part of the same app
// instead of the older standalone-modal look it predates.
const flowCardClass =
  "relative p-8 w-full max-w-[440px] mx-auto min-h-[560px] flex flex-col gap-6 bg-[radial-gradient(circle_at_30%_0%,var(--card),var(--card2)_65%)] rounded-2xl shadow-[0_30px_70px_rgba(0,0,0,0.45),0_0_0_1px_rgba(255,255,255,0.04)_inset] animate-modal-3d-in max-[480px]:p-6 max-[480px]:px-5 max-[480px]:min-h-[480px]";
const flowHeaderClass =
  "absolute left-0 w-full bottom-full mb-3 grid grid-cols-[1fr_auto_1fr] items-center text-white";
const backBtnClass =
  "col-start-1 justify-self-start inline-flex items-center gap-1 px-1 py-1 bg-transparent border-none text-white text-[0.9rem] font-semibold cursor-pointer transition-opacity duration-200 hover:opacity-75";
const primaryBtnClass =
  "w-full h-auto rounded-sm px-5 py-2.5 text-base font-bold text-black transition-all duration-200 hover:bg-gold-dark active:scale-[0.97] disabled:opacity-60 disabled:active:scale-100 shadow-lg shadow-gold/10 hover:shadow-gold/20 bg-gold flex items-center justify-center gap-2 cursor-pointer border-none disabled:cursor-not-allowed";
const ghostBtnClass =
  "w-full rounded-sm px-5 py-2.5 text-base font-semibold text-foreground bg-white/[0.03] border border-white/[0.08] transition-all duration-200 hover:bg-white/[0.06] hover:border-gold/20 active:scale-[0.97] flex items-center justify-center gap-2 cursor-pointer";

function ProfileImageCapture({ user, onRefreshUser, onBack }) {
  const [cameraError, setCameraError] = useState('');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [flash, setFlash] = useState(false);
  const [success, setSuccess] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);

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
        try {
          await videoRef.current.play();
        } catch (playError) {
          console.warn('Video playback warning:', playError);
        }
      }
      setIsCameraActive(true);
      setCameraError('');
    } catch (err) {
      setCameraError('Camera access denied. Please allow permission and refresh.');
      setIsCameraActive(false);
    }
  }, [stopCamera]);

  const captureImage = () => {
    if (!videoRef.current || !canvasRef.current || !isCameraActive) return;
    const video = videoRef.current;
    if (!video.videoWidth || !video.videoHeight) {
      setCameraError('Camera is not ready yet. Please try again.');
      return;
    }
    setFlash(true);
    setTimeout(() => setFlash(false), 350);
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      setCameraError('Unable to capture image.');
      return;
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = canvas.toDataURL('image/png');
    setCapturedImage(imageData);
    stopCamera();
  };

  const uploadImage = async () => {
    if (!capturedImage) return;
    setUploadError('');
    setUploading(true);
    try {
      // Content-Type is intentionally left unset here — axiosInstance's
      // request interceptor strips any manual override for FormData bodies
      // so the browser generates the multipart boundary itself.
      const blob = await fetch(capturedImage).then((r) => {
        if (!r.ok) throw new Error(`Failed to prepare image: ${r.status}`);
        return r.blob();
      });
      const file = new File([blob], "profile.png", { type: "image/png" });
      const formData = new FormData();
      formData.append("image", file);
      const response = await axiosInstance.post(
        '/api/upload-profile-image',
        formData,
        { timeout: 60000 },
      );
      if (response.data.success) {
        onRefreshUser();
        setSuccess(true);
        setTimeout(onBack, 1600);
      } else {
        setUploadError(
          response.data?.error ||
            response.data?.message ||
            'Upload failed. Please try again.',
        );
      }
    } catch (err) {
      if (err.code === 'ECONNABORTED') {
        setUploadError('Upload timed out. Please check your connection and try again.');
      } else if (err.response) {
        setUploadError(
          err.response.data?.error ||
            err.response.data?.message ||
            `Upload failed (server error ${err.response.status}).`,
        );
      } else if (err.request) {
        setUploadError('Upload failed: no response from server.');
      } else {
        setUploadError(err.message || 'Upload failed. Please try again.');
      }
    } finally {
      setUploading(false);
    }
  };

  useEffect(() => {
    startCamera();
    return () => stopCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (success) {
    return (
      <div className="flex justify-center items-center p-4 box-border">
        <div className={cn(flowCardClass, "items-center justify-center text-center")}>
          <CheckCircle2 size={64} className="text-success animate-flow-fade-in" />
          <h2 className="text-[1.6rem] font-bold text-foreground m-0">Photo updated!</h2>
          <p className="text-[var(--muted)] text-sm">
            Your new profile photo is live. Taking you back…
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-center items-center p-4 box-border">
      {/* ponytail: the face-guide oval's pulse isn't among the globally
          registered animate-* utilities, so it's kept as a tiny scoped
          @keyframes here rather than touching tailwind.config.js. */}
      <style>{`
        @keyframes profileGuidePulse {
          0% { opacity: 0.7; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.04); }
          100% { opacity: 0.7; transform: scale(1); }
        }
      `}</style>
      <div className={flowCardClass}>
        <div className={flowHeaderClass}>
          <button onClick={onBack} className={backBtnClass}>
            <ArrowLeft size={18} /> Back
          </button>
        </div>

        <h2 className="text-[1.6rem] font-bold text-foreground text-center m-0">
          Update Profile Photo
        </h2>

        <div className="w-full flex-1 flex flex-col items-center justify-center gap-5">
          {!capturedImage ? (
            <>
              {cameraError ? (
                <div className="w-full text-center p-5 bg-destructive/10 border border-destructive/20 rounded-xl">
                  <p className="text-destructive text-sm mb-3">{cameraError}</p>
                  <button onClick={startCamera} className={ghostBtnClass}>
                    Retry camera
                  </button>
                </div>
              ) : (
                <div className="relative w-full aspect-[3/4] rounded-xl overflow-hidden ring-1 ring-white/[0.06] bg-black/40">
                  <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover block" />
                  <div className="absolute inset-0 flex flex-col justify-center items-center pointer-events-none p-6">
                    <svg
                      viewBox="0 0 350 460"
                      className="w-full max-w-[260px] h-auto"
                      style={{ animation: 'profileGuidePulse 3s infinite ease-in-out' }}
                    >
                      <ellipse cx="175" cy="230" rx="175" ry="230" fill="none" stroke="var(--gold)" strokeWidth="25" strokeOpacity="0.2" />
                      <ellipse cx="175" cy="230" rx="165" ry="215" fill="none" stroke="var(--gold)" strokeWidth="15" strokeOpacity="0.4" />
                      <ellipse cx="175" cy="230" rx="155" ry="205" fill="none" stroke="var(--gold)" strokeWidth="7" strokeDasharray="16,12" />
                    </svg>
                    <p className="text-gold text-sm font-semibold mt-3 text-center [text-shadow:0_2px_4px_rgba(0,0,0,0.8)]">
                      Position your face inside the oval
                    </p>
                  </div>
                  {/* Camera-shutter flash on capture */}
                  <div
                    className={cn(
                      "absolute inset-0 bg-white pointer-events-none transition-opacity duration-300",
                      flash ? "opacity-80" : "opacity-0",
                    )}
                  />
                </div>
              )}

              <button
                onClick={captureImage}
                disabled={!isCameraActive || !!cameraError}
                className={primaryBtnClass}
              >
                <Camera size={18} /> Capture photo
              </button>
            </>
          ) : (
            <>
              <div className="relative w-full aspect-[3/4] rounded-xl overflow-hidden ring-2 ring-gold/30 animate-flow-fade-in">
                <img
                  src={capturedImage}
                  alt="Captured"
                  className="w-full h-full object-cover block"
                />
              </div>
              <div className="flex flex-col gap-3 w-full">
                {uploadError && (
                  <p className="text-xs text-red-400 text-center -mb-1">{uploadError}</p>
                )}
                <button
                  onClick={uploadImage}
                  disabled={uploading}
                  className={primaryBtnClass}
                >
                  {uploading ? (
                    <>
                      <Loader2 size={18} className="animate-spin" /> Uploading…
                    </>
                  ) : (
                    <>
                      <Check size={18} /> Use this photo
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    setCapturedImage(null);
                    setUploadError('');
                    startCamera();
                  }}
                  disabled={uploading}
                  className={ghostBtnClass}
                >
                  <RotateCcw size={16} /> Retake photo
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

export default ProfileImageCapture;
